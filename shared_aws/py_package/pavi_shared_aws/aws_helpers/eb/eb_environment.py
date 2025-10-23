'''
Module containing helper functions to interact with AWS Elasticbeanstalk environments.
Note: these functions are calling AWS synchronously (so will search/modify AWS resources instantly).
'''
from boto3 import client
from typing import TYPE_CHECKING, TypedDict

if TYPE_CHECKING:
    from mypy_boto3_elasticbeanstalk.type_defs import EnvironmentDescriptionTypeDef
else:
    EnvironmentDescriptionTypeDef = object

boto3_eb_client = client('elasticbeanstalk')


def describe_eb_environment(environment_name: str) -> EnvironmentDescriptionTypeDef | None:
    '''
    Describe EB environment with given name.

    Args:
        environment_name: name of the application environment to search

    Returns:
        dict representation of EB environment if found, None otherwise.

    Raises:
        Exception: when >1 matching application versions are found.
    '''

    ## Search Application version by label
    search_environment_response = boto3_eb_client.describe_environments(
        EnvironmentNames=[environment_name]
    )

    found_environments: list[EnvironmentDescriptionTypeDef] = search_environment_response['Environments']

    if len(found_environments) > 1:
        raise Exception(f'Unexpected number of environments ({len(found_environments)} > 1) matching name {environment_name}.')
    elif len(found_environments) == 1:
        return found_environments.pop()
    else:
        return None


class EBEnvironmentHealth(TypedDict):
    Color: str
    Status: str


def get_eb_environment_health(environment_name: str) -> EBEnvironmentHealth:
    '''
    Search EB environment with given name and return its health.

    Args:
        environment_name: name of the application environment to search

    Returns:
        Health of the environment (color)

    Raises:
        Exception: when failing to find or process environment.
    '''

    ## Search Application version by label
    environment: EnvironmentDescriptionTypeDef | None = describe_eb_environment(environment_name=environment_name)

    if environment is None:
        raise Exception(f'No environment found with name {environment_name}')
    else:
        health_color: str = environment['Health']
        health_status: str = environment['HealthStatus']
        return {
            'Color': health_color,
            'Status': health_status
        }
