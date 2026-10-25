"""Writes the Phase 6 mockups (a.html, b.html, c.html, index.html) into docs/design/direction/.
Run from anywhere: python3 docs/design/direction/build/build.py"""
import importlib, os, sys
sys.dont_write_bytecode = True  # no __pycache__ in the public repository
HERE = os.path.dirname(os.path.abspath(__file__)); OUT = os.path.dirname(HERE)
sys.path.insert(0, HERE)
for name, fn in [('gen_a', 'a.html'), ('gen_b', 'b.html'), ('gen_c', 'c.html'), ('gen_index', 'index.html')]:
    with open(os.path.join(OUT, fn), 'w', encoding='utf-8') as f:
        f.write(importlib.import_module(name).page())
    print(fn)
