.PHONY: check-venv-active

check-venv-active:
ifeq ($(VIRTUAL_ENV),)
	@echo 'No active python virtual environment found.'\
		  'Please active the virtual environment first by running `source venv/bin/activate`,'\
		  'or read README.md for instructions on how to set up a new one.'
	@exit 1
else
	@:
endif

python-dependencies:
	pip install -r requirements.txt

python-test-dependencies:
	pip install -r tests/requirements.txt

run-unit-tests: python-dependencies python-test-dependencies
	python -m pytest

run-unit-tests-dev: check-venv-active python-dependencies python-test-dependencies
	python -m pytest

run-python-type-check: python-dependencies python-test-dependencies
	mypy --install-types --non-interactive --warn-unused-config .

run-python-style-check: python-dependencies python-test-dependencies
	flake8 ./
