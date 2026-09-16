import importlib.util
from pathlib import Path
import pytest

spec=importlib.util.spec_from_file_location('compare_eval_reports',Path(__file__).resolve().parents[2]/'scripts/compare_eval_reports.py')
module=importlib.util.module_from_spec(spec);spec.loader.exec_module(module)


def test_cross_python_cost_roundoff_is_tolerated():
    module.compare({'cost':.006939,'gate':False,'count':12},{'cost':.006939000000000001,'gate':False,'count':12})


@pytest.mark.parametrize('changed',[{'cost':.006939,'gate':False,'count':12.0},{'cost':.00694,'gate':False,'count':12},{'cost':.006939,'gate':0,'count':12},{'cost':.006939,'gate':False,'count':13},{'cost':float('nan'),'gate':False,'count':12},{'cost':.006939,'count':12}])
def test_material_result_or_structure_changes_fail(changed):
    with pytest.raises(AssertionError):module.compare({'cost':.006939,'gate':False,'count':12},changed)
