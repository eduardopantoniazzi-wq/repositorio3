from __future__ import annotations
import re
import pandas as pd
from .base import LeitorBase, _limpar_valor

_RE_DATA = re.compile(r"\d{2}/\d{2}/\d{4}")
_RE_VAL_CD = re.compile(r"([\d]{1,3}(?:\.\d{3})*,\d{2})\s*\n?\s*([CD])")
_RE_VAL_NUM = re.compile(r"-?[\d]{1,3}(?:\.\d{3})*,\d{2}")

def _extrair_cd(texto):
    t = str(texto or "").replace("\n", " ").strip()
    m = _RE_VAL_CD.search(t)
    if m:
        v = _limpar_valor(m.group(1))
        return (v, 0.0) if m.group(2) == "C" else (0.0, v)
    m2 = _RE_VAL_NUM.search(t)
    if m2:
        v = _limpar_valor(m2.group())
        return (v, 0.0) if v >= 0 else (0.0, abs(v))
    return 0.0, 0.0

class LeitorBB(LeitorBase):
    BANCO = "BB"
    def _parse_pdf(self) -> pd.DataFrame:
        import pdfplumber
        all_rows = []
        with pdfplumber.open(self.caminho) as pdf:
            for page in pdf.pages:
                tbl = page.extract_table()
                if not tbl: continue
                start = 0
                for i, row in enumerate(tbl):
                    if row and any("Hist" in str(c or "") or "balancete" in str(c or "").lower() for c in row):
                        start = i + 1; break
                all_rows.extend(tbl[start:])
        if not all_rows: raise ValueError(f"Nenhuma tabela no PDF BB: {self.caminho}")
        registros = self._reconstruir(all_rows)
        if not registros: raise ValueError(f"Nenhuma transação extraída do PDF BB: {self.caminho}")
        return pd.DataFrame(registros)
    def _reconstruir(self, rows):
        registros, i = [], 0
        while i < len(rows):
            row = list(rows[i])
            while len(row) < 8: row.append(None)
            dt_bal,dt_mov,historico,doc,val_raw,sld_raw = str(row[0] or "").strip(),str(row[1] or "").strip(),str(row[4] or "").strip(),str(row[5] or "").strip(),str(row[6] or "").strip(),str(row[7] or "").strip()
            tem_data = _RE_DATA.search(dt_bal) or _RE_DATA.search(dt_mov)
            if not tem_data and not _RE_VAL_CD.search(val_raw) and not historico: i+=1; continue
            m = _RE_DATA.search(dt_mov) or _RE_DATA.search(dt_bal)
            data = m.group() if m else ""
            hist_limpo = re.sub(r"^\d{3,5}\s+", "", re.sub(r"^\d{3,5}\s+", "", historico).strip()).strip()
            _INVEST = ("rende facil","rende fácil","bb rende","aplic auto","aplicacao automatica","aplicação automática","resgate automatico","resgate automático")
            if any(p in hist_limpo.lower() for p in _INVEST): i+=1; continue
            beneficiario = ""
            if i+1 < len(rows):
                prox = list(rows[i+1])
                while len(prox) < 8: prox.append(None)
                ph,pv = str(prox[4] or "").strip(), str(prox[6] or "").strip()
                if not _RE_DATA.search(str(prox[0] or "")) and ph and not _RE_VAL_CD.search(pv) and not _RE_VAL_NUM.search(pv):
                    beneficiario = ph; i+=1
            descricao = f"{hist_limpo} / {beneficiario}".strip(" /") if beneficiario else hist_limpo
            cred, deb = _extrair_cd(val_raw)
            m_sld = _RE_VAL_NUM.search(sld_raw)
            saldo = _limpar_valor(m_sld.group()) if m_sld else None
            if re.search(r"\bS\s*A\s*L\s*D\s*O\b", hist_limpo, re.IGNORECASE):
                sf = cred if cred>0 else (deb if deb>0 else (saldo or 0))
                if sf and sf>0:
                    if registros: registros[-1]["saldo"] = sf
                    registros.append({"data":data or (registros[-1]["data"] if registros else "01/01/2000"),"descricao":"SALDO FINAL","documento":"","credito":0.0,"debito":0.0,"saldo":sf})
                i+=1; continue
            if data: registros.append({"data":data,"descricao":descricao,"documento":doc,"credito":cred,"debito":deb,"saldo":saldo})
            i+=1
        return registros
    def _parse_excel(self):
        for hr in range(0,10):
            try: return self._normalizar_tabular(pd.read_excel(self.caminho, header=hr))
            except: continue
        raise ValueError(f"Excel BB não reconhecido: {self.caminho}")
    def _parse_csv(self):
        for sep in (";",",","\t"):
            for enc in ("utf-8","latin-1","cp1252"):
                for hr in range(0,10):
                    try: return self._normalizar_tabular(pd.read_csv(self.caminho,sep=sep,encoding=enc,header=hr,dtype=str,on_bad_lines="skip"))
                    except: continue
        raise ValueError(f"CSV BB não reconhecido: {self.caminho}")
    _MAP = {r"dt\.?movimento|data mov":"data",r"hist[oó]rico":"descricao",r"documento|doc":"documento",r"valor":"valor",r"saldo":"saldo"}
    def _normalizar_tabular(self, df):
        mapa = {}
        for col in df.columns:
            cl = str(col).strip().lower()
            for p,n in self._MAP.items():
                if re.search(p,cl): mapa[col]=n; break
        df = df.rename(columns=mapa)
        if "valor" in df.columns:
            df["valor_num"] = df["valor"].apply(_limpar_valor)
            df["credito"] = df["valor_num"].apply(lambda v: v if v>0 else 0.0)
            df["debito"] = df["valor_num"].apply(lambda v: abs(v) if v<0 else 0.0)
            df = df.drop(columns=["valor","valor_num"],errors="ignore")
        return df
