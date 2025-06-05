import json
from pathlib import Path


def check_project_file(path: Path) -> None:
    with path.open() as f:
        data = json.load(f)
    assert 'id' in data, f'{path} missing "id" key'
    assert 'title' in data, f'{path} missing "title" key'


def check_projects_list(path: Path) -> None:
    with path.open() as f:
        data = json.load(f)
    assert isinstance(data, list), f'{path} should contain a list'
    for item in data:
        assert 'id' in item, f'Entry in {path} missing "id" key'


def main() -> None:
    root = Path(__file__).resolve().parents[1]
    projects_dir = root / 'data' / 'projects'
    for project_file in projects_dir.glob('*.json'):
        check_project_file(project_file)
    check_projects_list(root / 'data' / 'projects-list.json')
    print('All JSON files are valid.')


if __name__ == '__main__':
    main()
