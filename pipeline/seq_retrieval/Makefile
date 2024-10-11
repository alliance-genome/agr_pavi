mkfile_dir := $(dir $(abspath $(lastword $(MAKEFILE_LIST))))

CONTAINER_NAME=agr_pavi/pipeline_seq_retrieval
TAG_NAME?=latest
ADDITIONAL_BUILD_ARGS=
EXTRA_PIP_COMPILE_ARGS ?=

AWS_DEFAULT_REGION := us-east-1
AWS_ACCT_NR=100225593120
REG=${AWS_ACCT_NR}.dkr.ecr.${AWS_DEFAULT_REGION}.amazonaws.com

.PHONY: check-% clean container-image install-% push-% registry-docker-login run-% update-% _vars-% _write-lock-file

registry-docker-login:
ifneq ($(shell echo ${REG} | egrep "ecr\..+\.amazonaws\.com"),)
	@$(eval DOCKER_LOGIN_CMD=docker run --rm -it -v ~/.aws:/root/.aws amazon/aws-cli)
ifneq (${AWS_PROFILE},)
	@$(eval DOCKER_LOGIN_CMD=${DOCKER_LOGIN_CMD} --profile ${AWS_PROFILE})
endif
	@$(eval DOCKER_LOGIN_CMD=${DOCKER_LOGIN_CMD} ecr get-login-password --region=${AWS_DEFAULT_REGION} | docker login -u AWS --password-stdin https://${REG})
	${DOCKER_LOGIN_CMD}
endif

clean:
	$(eval ADDITIONAL_BUILD_ARGS := --no-cache)
	@:

container-image:
	docker build ${ADDITIONAL_BUILD_ARGS} -t ${CONTAINER_NAME} .

push-container-image: registry-docker-login
	docker tag ${CONTAINER_NAME} ${REG}/${CONTAINER_NAME}:${TAG_NAME}
	docker push ${REG}/${CONTAINER_NAME}:${TAG_NAME}

requirements.txt:
	$(eval EXTRA_PIP_COMPILE_ARGS:=)
	$(eval $(shell $(MAKE) --no-print-directory -C $(mkfile_dir) _vars-no-upgrade))
	$(eval $(shell $(MAKE) --no-print-directory -C $(mkfile_dir) _vars-main-deps))
	@$(MAKE) --no-print-directory _write-lock-file EXTRA_PIP_COMPILE_ARGS="${EXTRA_PIP_COMPILE_ARGS}"

tests/requirements.txt:
	$(eval EXTRA_PIP_COMPILE_ARGS:=)
	$(eval $(shell $(MAKE) --no-print-directory -C $(mkfile_dir) _vars-no-upgrade))
	$(eval $(shell $(MAKE) --no-print-directory -C $(mkfile_dir) _vars-test-deps))
	@$(MAKE) --no-print-directory _write-lock-file EXTRA_PIP_COMPILE_ARGS="${EXTRA_PIP_COMPILE_ARGS}"

update-deps-lock:
	$(eval EXTRA_PIP_COMPILE_ARGS:=)
	$(eval $(shell $(MAKE) --no-print-directory -C $(mkfile_dir) _vars-upgrade-all))
	$(eval $(shell $(MAKE) --no-print-directory -C $(mkfile_dir) _vars-main-deps))
	@$(MAKE) --no-print-directory _write-lock-file EXTRA_PIP_COMPILE_ARGS="${EXTRA_PIP_COMPILE_ARGS}"

update-test-deps-lock:
	$(eval EXTRA_PIP_COMPILE_ARGS:=)
	$(eval $(shell $(MAKE) --no-print-directory -C $(mkfile_dir) _vars-upgrade-all))
	$(eval $(shell $(MAKE) --no-print-directory -C $(mkfile_dir) _vars-test-deps))
	@$(MAKE) --no-print-directory _write-lock-file EXTRA_PIP_COMPILE_ARGS="${EXTRA_PIP_COMPILE_ARGS}"

update-deps-locks-all: update-deps-lock update-test-deps-lock
	@:

install-deps: .venv/ requirements.txt
	.venv/bin/pip install -r requirements.txt

install-deps-update: .venv/
	.venv/bin/pip install -U -r requirements.txt

install-test-deps: .venv/ tests/requirements.txt
	.venv/bin/pip install -r tests/requirements.txt

run-type-checks: .venv/ install-test-deps
	.venv/bin/mypy --install-types --non-interactive --warn-unused-config ./

run-style-checks: .venv/ install-test-deps
	.venv/bin/flake8 ./

run-unit-tests: .venv/ install-test-deps
	.venv/bin/python -m pytest --cov --cov-fail-under=80

run-unit-tests-dev: .venv/ install-test-deps
	.venv/bin/python -m pytest --cov --cov-fail-under=80 --cov-report html -v

run-code-checks: run-type-checks run-style-checks run-unit-tests

run-build-checks: containter-image

.venv/:
	python3.12 -m venv .venv/

.venv-build/:
	python3.12 -m venv .venv-build/
	.venv-build/bin/pip install pip-tools==7.4.1

_vars-main-deps:
	@echo "EXTRA_PIP_COMPILE_ARGS+=-o requirements.txt"

_vars-test-deps:
	@echo "EXTRA_PIP_COMPILE_ARGS+=--extra=test -o tests/requirements.txt"

_vars-no-upgrade:
	@echo "EXTRA_PIP_COMPILE_ARGS+=--no-upgrade"

_vars-upgrade-all:
	@echo "EXTRA_PIP_COMPILE_ARGS+=--upgrade"

_write-lock-file: .venv-build/
	.venv-build/bin/pip-compile --generate-hashes --no-strip-extras -q ${EXTRA_PIP_COMPILE_ARGS}
