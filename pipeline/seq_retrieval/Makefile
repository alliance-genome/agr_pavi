CONTAINER_NAME=agr_pavi/pipeline_seq_retrieval
TAG_NAME?=latest
ADDITIONAL_BUILD_ARGS=

AWS_DEFAULT_REGION := us-east-1
AWS_ACCT_NR=100225593120
REG=${AWS_ACCT_NR}.dkr.ecr.${AWS_DEFAULT_REGION}.amazonaws.com

.PHONY: check-venv-active run-type-checks clean pip-tools

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

pip-tools:
	pip install pip-tools==7.4.1

requirements.txt:
	pip-compile --generate-hashes --no-strip-extras -o requirements.txt

tests/requirements.txt:
	pip-compile --generate-hashes --no-strip-extras --extra=test -o tests/requirements.txt

deps: requirements.txt
	pip install -r requirements.txt

deps-update:
	pip install -U -r requirements.txt

deps-lock-update:
	pip-compile --generate-hashes --no-strip-extras --upgrade -o requirements.txt

test-deps: tests/requirements.txt
	pip install -r tests/requirements.txt

test-deps-lock-update:
	pip-compile --generate-hashes --no-strip-extras --extra=test --upgrade -o tests/requirements.txt

run-type-checks: test-deps
	mypy --install-types --non-interactive --warn-unused-config ./

run-style-checks: test-deps
	flake8 ./

run-unit-tests: test-deps
	python -m pytest --cov --cov-fail-under=80

run-unit-tests-dev: test-deps
	python -m pytest --cov --cov-fail-under=80 --cov-report html -v

run-code-checks: run-type-checks run-style-checks run-unit-tests

run-build-checks: containter-image

check-venv-active:
ifeq ($(VIRTUAL_ENV),)
	@echo 'No active python virtual environment found.'\
		  'Please active the virtual environment first by running `source .venv/bin/activate`,'\
		  'or read README.md for instructions on how to set up a new one.'
	@exit 1
else
	@:
endif

deps-dev: check-venv-active deps

deps-dev-update: check-venv-active deps-update

run-type-checks-dev: check-venv-active run-type-checks

.venv/:
	python3.12 -m venv .venv/
