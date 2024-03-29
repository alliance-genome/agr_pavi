.PHONY: check-venv-active run-python-type-check

container-image:
	docker build --no-cache -t agr_pavi/seq_retrieval .

python-dependencies:
	pip install -r requirements.txt

python-dependencies-update:
	pip install -U -r requirements.txt

python-test-dependencies:
	pip install -r tests/requirements.txt

run-python-type-check: python-dependencies python-test-dependencies
	mypy --install-types --non-interactive --warn-unused-config src/

run-python-style-check: python-dependencies python-test-dependencies
	flake8 ./

run-unit-tests: python-dependencies python-test-dependencies
	python -m pytest --cov --cov-fail-under=80

run-unit-tests-dev: python-dependencies python-test-dependencies
	python -m pytest --cov --cov-fail-under=80 --cov-report html

run-code-checks: run-python-type-check run-python-style-check run-unit-tests

run-build-checks: containter-image

check-venv-active:
ifeq ($(VIRTUAL_ENV),)
	@echo 'No active python virtual environment found.'\
		  'Please active the virtual environment first by running `source venv/bin/activate`,'\
		  'or read README.md for instructions on how to set up a new one.'
	@exit 1
else
	@:
endif

python-dependencies-dev: check-venv-active python-dependencies

python-dependencies-dev-update: check-venv-active python-dependencies-update

run-python-type-check-dev: check-venv-active run-python-type-check
