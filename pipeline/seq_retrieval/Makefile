CONTAINER_NAME=agr_pavi/pipeline_seq_retrieval
TAG_NAME?=latest
ADDITIONAL_BUILD_ARGS=

AWS_DEFAULT_REGION := us-east-1
AWS_ACCT_NR=100225593120
REG=${AWS_ACCT_NR}.dkr.ecr.${AWS_DEFAULT_REGION}.amazonaws.com

.PHONY: check-venv-active run-python-type-check clean

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

# Target to install poetry
POETRY_VERSION=1.8.3
poetry:
	export POETRY_VERSION=${POETRY_VERSION} && \
	  curl -sSL https://install.python-poetry.org | python3 -

python-dependencies:
	poetry install --only main

python-dependencies-update:
	poetry update

python-dependencies-lock-update:
	poetry lock --no-interaction

python-test-dependencies:
	poetry install --only test

run-python-type-check: python-dependencies python-test-dependencies
	mypy --install-types --non-interactive --warn-unused-config ./

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
