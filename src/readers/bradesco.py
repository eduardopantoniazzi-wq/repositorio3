from __future__ import annotations
import re
import pandas as pd
from .base import LeitorBase, _limpar_valor, COLUNAS_PADRAO

_RE_VALOR = re.compile(r"-?[\d]{1,3}(?:\.\d{3})*,\d{2}")
_RE_DATA = re.compile(r"\b(\d{2}/\d{2}/\d{4})\b")

class LeitorBradesco(LeitorBase):
    BANCO = "Bradesco"
    def _parse_pdf(self):
        import pdfplumber
        linhas = []
        with pdfplumber.open(self.caminho) as pdf:
            for page in pdf.pages:
                txt = page.extract_text(layout=True)
                if txt: linhas.extend(txt.splitlines())
        return self._parsear_linhas(linhas)
    def _parse_excel(self):
        for hr in range(0,10):
            try:
                df = self._renomear_colunas_tabular(pd.read_excel(self.caminho, header=hr))
                if {"data","descricao","saldo"}.issubset(df.columns): return df
            except: continue
        raise ValueError(f"Excel Bradesco não reconhecido: {self.caminho}")
    def _parse_csv(self):
        for sep in (";",",","\t"):
            for enc in ("utf-8","latin-1","cp1252"):
                for hr in range(0,10):
                    try:
                        df = self._renomear_colunas_tabular(pd.read_csv(self.caminho,sep=sep,encoding=enc,header=hr,dtype=str,on_bad_lines="skip"))
                        if {"data","descricao","saldo"}.issubset(df.columns): return df
                    except: continue
        raise ValueError(f"CSV Bradesco não reconhecido: {self.caminho}")
    def _parsear_linhas(self, linhas):
        registros, data_atual, desc_acumulada = [], "", []
        def tem_valores(l): return len(_RE_VALOR.findall(l)) >= 1
        def extrair_valores(l):
            vals = _RE_VALOR.findall(l)
            if not vals: return None,None,None
            s = vals[-1]
            if len(vals)>=3: return vals[-3],vals[-2],s
            elif len(vals)==2: v=vals[-2]; return (None,v,s) if v.startswith("-") else (v,None,s)
            return None,None,s
        def extrair_dcto(l):
            docs = re.findall(r"\b\d{5,}\b", _RE_DATA.sub("",_RE_VALOR.sub("",l)))
            return docs[0] if docs else ""
        _IGNORAR = {"data","lançamento","dcto","crédito","débito","saldo","total","saldos invest",
                    "histórico","folha","os dados","extrato","agência","conta","nome do usuário",
                    "bradesco","net empresa","data da operação","últimos lançamentos"}
        _INVEST = ("saldo invest fácil","saldo invest facil","saldo invest plus","saldo rende facil","saldo rende fácil")
        def eh_ctrl(l): ll=l.strip().lower(); return not ll or any(ll.startswith(i) for i in _IGNORAR)
        def eh_inv(l): ll=l.strip().lower(); return any(p in ll for p in _INVEST)
        i = 0
        while i < len(linhas):
            ln = linhas[i]; ls = ln.strip()
            if eh_inv(ls): i+=1; continue
            if eh_ctrl(ln) and not _RE_DATA.search(ln): i+=1; continue
            md = _RE_DATA.search(ln)
            if tem_valores(ln):
                if md: data_atual = md.group(1)
                cred,deb,saldo = extrair_valores(ln)
                dcto = extrair_dcto(ln)
                desc_linha = re.sub(r"\b\d{5,}\b","",_RE_DATA.sub("",_RE_VALOR.sub("",ln))).strip()
                dp = desc_acumulada.copy()
                if desc_linha: dp.append(desc_linha)
                descricao = " / ".join(p.strip() for p in dp if p.strip())
                if i+1 < len(linhas):
                    prox = linhas[i+1].strip()
                    if prox and not tem_valores(prox) and not eh_ctrl(prox) and not _RE_DATA.match(prox):
                        descricao = (descricao+" / "+prox) if descricao else prox; i+=1
                if data_atual and saldo:
                    registros.append({"data":data_atual,"descricao":descricao or "","documento":dcto,"credito":cred or "","debito":deb or "","saldo":saldo})
                desc_acumulada = []
            else:
                if ls and not eh_ctrl(ln):
                    if md: data_atual=md.group(1); desc=_RE_DATA.sub("",ls).strip(); desc_acumulada=[desc] if desc else []
                    else: desc_acumulada.append(ls)
                elif not ls: desc_acumulada=[]
            i+=1
        if not registros: raise ValueError(f"Nenhuma transação extraída do PDF Bradesco: {self.caminho}")
        return pd.DataFrame(registros)
    _MAP = {r"data":"data",r"lan[çc]amento|hist|descri":"descricao",r"dcto|doc":"documento",r"cr[eé]dito":"credito",r"d[eé]bito":"debito",r"saldo":"saldo"}
    def _renomear_colunas_tabular(self, df):
        mapa = {}
        for col in df.columns:
            cl = str(col).strip().lower()
            for p,n in self._MAP.items():
                if re.search(p,cl): mapa[col]=n; break
        return df.rename(columns=mapa)
