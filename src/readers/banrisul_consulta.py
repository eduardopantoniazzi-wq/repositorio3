from __future__ import annotations
import re
import pandas as pd
from pathlib import Path

_RE_NSU = re.compile(
    r"(?:(\d{2}/\d{2}/\d{4})\s+)?\d{8,}\s+(EFETUADA|PENDENTE|CANCELADA)\s+R\$\s*([\d.]+,\d{2})\s+(T[ií]tulo|Transfer[eê]ncia|Arrecada[cç][aã]o)",
    re.IGNORECASE,
)
_RE_DATA_ONLY = re.compile(r"^\s*(\d{2}/\d{2}/\d{4})\s*$")
_IGNORAR = {"data nsu","complemento","banco do estado","consulta opera","situacao","efetuados","total","sac:","toda transacao","ouvidoria","agencia/conta"}

def _eh_cabecalho(linha):
    l = linha.strip().lower()
    return not l or any(l.startswith(p) for p in _IGNORAR) or "conta:" in l

def ler_consulta_banrisul(caminho) -> pd.DataFrame:
    import pdfplumber
    linhas = []
    with pdfplumber.open(Path(caminho)) as pdf:
        for page in pdf.pages:
            txt = page.extract_text() or ""
            linhas.extend(txt.split("\n"))
    registros, data_atual, aguardando = [], None, None
    for linha in linhas:
        l = linha.strip()
        if _eh_cabecalho(l): continue
        m_nsu = _RE_NSU.search(l)
        if m_nsu:
            if m_nsu.group(1): data_atual = m_nsu.group(1)
            aguardando = {"data": data_atual, "valor": float(m_nsu.group(3).replace(".","").replace(",",".")), "operacao": m_nsu.group(4)}
            continue
        m_data = _RE_DATA_ONLY.match(l)
        if m_data: data_atual = m_data.group(1); continue
        if aguardando and aguardando.get("data"):
            partes = l.split(" - ")
            op = aguardando["operacao"].lower()
            benef = partes[-1].strip() if "transfer" in op and len(partes)>=2 else partes[0].strip()
            if benef: registros.append({"data":aguardando["data"],"valor":aguardando["valor"],"beneficiario":benef,"operacao":aguardando["operacao"]})
            aguardando = None
    if not registros: return pd.DataFrame(columns=["data","valor","beneficiario","operacao"])
    df = pd.DataFrame(registros)
    df["data"] = pd.to_datetime(df["data"], dayfirst=True, errors="coerce")
    return df.dropna(subset=["data"])
