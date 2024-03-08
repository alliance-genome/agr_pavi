.PHONY: check-venv-active

container-image:
	docker build -t agr_pavi/seq_retrieval .
python-dependencies:
	pip install -r requirements.txt
python-dependencies-update:
	pip install -U -r requirements.txt
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
