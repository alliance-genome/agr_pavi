mkfile_dir := $(dir $(abspath $(lastword $(MAKEFILE_LIST))))
include $(mkfile_dir)/../../common_make

CONTAINER_NAME=agr_pavi/pipeline_seq_retrieval
TAG_NAME?=latest
ADDITIONAL_BUILD_ARGS=


.PHONY: check-% clean container-image install-% push-% run-% update-%

clean:
	$(eval ADDITIONAL_BUILD_ARGS := --no-cache)
	rm -rf .venv/ .venv-build/

container-image:
	docker build ${ADDITIONAL_BUILD_ARGS} -t ${CONTAINER_NAME} .

push-container-image: registry-docker-login
	docker tag ${CONTAINER_NAME} ${REG}/${CONTAINER_NAME}:${TAG_NAME}
	docker push ${REG}/${CONTAINER_NAME}:${TAG_NAME}

update-deps-lock: update-python-deps-lock

update-test-deps-lock: update-python-test-deps-lock

update-deps-locks-all: update-deps-lock update-test-deps-lock
	@:

install-deps: install-python-deps

install-deps-update: update-deps-lock install-deps
	@:

install-test-deps: install-python-test-deps
	.venv/bin/pip install --editable .

run-type-checks: .venv/ install-test-deps
	.venv/bin/mypy --install-types --non-interactive --warn-unused-config ./

run-style-checks: .venv/ install-test-deps
	.venv/bin/flake8 ./

run-unit-tests: .venv/ install-test-deps
	.venv/bin/python -m pytest --cov

run-unit-tests-dev: .venv/ install-test-deps
	.venv/bin/python -m pytest --cov --cov-report html -v --capture=tee-sys

run-code-checks: run-type-checks run-style-checks run-unit-tests

run-build-checks: containter-image
