"""Генератор синтетических транзакций.

Профили: normal_teen, student_parttime, self_employed, drop_newbie, drop_active.
TODO(Даша): реализовать; сид трёх демо-персонажей — в content/personas.json.
"""
import argparse

PROFILES = ["normal_teen", "student_parttime", "self_employed", "drop_newbie", "drop_active"]


def generate(clients: int, days: int):
    raise NotImplementedError


if __name__ == "__main__":
    p = argparse.ArgumentParser()
    p.add_argument("--clients", type=int, default=3000)
    p.add_argument("--days", type=int, default=60)
    p.add_argument("--out", default="data/transactions.parquet")
    args = p.parse_args()
    generate(args.clients, args.days).to_parquet(args.out)
