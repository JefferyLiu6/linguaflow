"""Compare replay reports across Python versions without masking material drift.

Python 3.12 changed floating-point sum accuracy. Permit only absolute 1e-12
numeric roundoff; keys, counts, decisions, hashes and strings remain exact.
"""
import json
import math
import sys


def compare(expected, actual, path='$'):
    if isinstance(expected, bool) or isinstance(actual, bool):
        if type(expected) is not type(actual) or expected != actual:
            raise AssertionError(f'{path}: boolean changed')
    elif isinstance(expected, (int,float)) and isinstance(actual, (int,float)):
        if isinstance(expected,int) or isinstance(actual,int):
            if type(expected) is not type(actual) or expected!=actual:raise AssertionError(f'{path}: integer changed')
        elif not (math.isfinite(expected) and math.isfinite(actual) and math.isclose(expected,actual,rel_tol=0,abs_tol=1e-12)):
            raise AssertionError(f'{path}: numeric result changed')
    elif isinstance(expected,dict) and isinstance(actual,dict):
        if expected.keys()!=actual.keys():raise AssertionError(f'{path}: keys changed')
        for key in expected:compare(expected[key],actual[key],f'{path}.{key}')
    elif isinstance(expected,list) and isinstance(actual,list):
        if len(expected)!=len(actual):raise AssertionError(f'{path}: length changed')
        for i,(a,b) in enumerate(zip(expected,actual)):compare(a,b,f'{path}[{i}]')
    elif type(expected) is not type(actual) or expected!=actual:
        raise AssertionError(f'{path}: value changed')


if __name__=='__main__':
    with open(sys.argv[1]) as a, open(sys.argv[2]) as b:
        compare(json.load(a),json.load(b))
    print('Replay matches; numeric tolerance 1e-12 absolute, zero relative tolerance.')
