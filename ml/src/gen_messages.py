"""Датасет сообщений для Щита: drop_recruitment / other_fraud / safe.

Источники: перефразы открытых памяток ЦБ/МВД + аугментация LLM (сленг, опечатки, эмодзи)
+ «трудные» легальные вакансии. Без персональных данных.
TODO(Даша): реализовать.
"""
import argparse

if __name__ == "__main__":
    p = argparse.ArgumentParser()
    p.add_argument("--out", default="data/messages.csv")
    args = p.parse_args()
    raise NotImplementedError
