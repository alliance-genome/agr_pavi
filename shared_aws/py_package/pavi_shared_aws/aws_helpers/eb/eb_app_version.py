'''
Module containing helper functions to interact with AWS Elasticbeanstalk
Note: these functions are calling AWS synchronously (so will search/modify AWS resources instantly).
'''

from boto3 import client
from time import sleep
from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from mypy_boto3_elasticbeanstalk.type_defs import ApplicationVersionDescriptionTypeDef, S3LocationTypeDef, TagTypeDef
else:
    ApplicationVersionDescriptionTypeDef = object
    S3LocationTypeDef = object
    TagTypeDef = object

boto3_eb_client = client('elasticbeanstalk')


def describe_app_version(version_label: str, eb_app_name: str) -> ApplicationVersionDescriptionTypeDef | None:
    '''
    Describe EB app version with given label.

    Args:
        eb_app_name: name of the application to search a version of
        version_label: version label to search for

    Returns:
        dict representation of EB app version if found, None otherwise.

    Raises:
        Exception: when >1 matching application versions are found.
    '''

    ## Search Application version by label
    search_app_version_response = boto3_eb_client.describe_application_versions(
        ApplicationName=eb_app_name,
        VersionLabels=[version_label]
    )

    found_app_versions: list[ApplicationVersionDescriptionTypeDef] = search_app_version_response['ApplicationVersions']

    if len(found_app_versions) > 1:
        raise Exception(f'Unexpected number of version ({len(found_app_versions)} > 1) matching label {version_label} in application {eb_app_name}.')
    elif len(found_app_versions) == 1:
        return found_app_versions.pop()
    else:
        return None


def eb_app_version_exists(version_label: str, eb_app_name: str) -> bool:
    '''
    Search EB app version with given label. Return true if found, false otherwise.

    Args:
        eb_app_name: name of the application to search a version of
        version_label: version label to search for

    Returns:
        Boolean indicating if version was found or not.
    '''

    ## Search Application version by label
    app_version = describe_app_version(version_label=version_label, eb_app_name=eb_app_name)

    if app_version is not None:
        return True
    else:
        return False


def get_eb_app_version_status(version_label: str, eb_app_name: str) -> str:
    '''
    Search EB app version with given label and return its status.

    Args:
        eb_app_name: name of the application to search a version of
        version_label: version label to search for

    Returns:
        Status of the application version

    Raises:
        Exception: when failing to find or process application version.
    '''

    ## Search Application version by label
    app_version = describe_app_version(version_label=version_label, eb_app_name=eb_app_name)

    if app_version is None:
        raise Exception(f'No application version found with label {version_label} in application {eb_app_name}')
    else:
        app_version_status: str = app_version['Status']
        return app_version_status.lower()


def create_eb_app_version(version_label: str, eb_app_name: str,
                          source_bundle: S3LocationTypeDef, tags: list[TagTypeDef] = []) -> ApplicationVersionDescriptionTypeDef | None:
    '''
    Create EB app version with given label.

    Args:
        eb_app_name: name of the application to create a version of
        version_label: version label to create (should not exists)
        source_bundle: EB source bundle to deploy
        source_bundle: Optional list of tags to add to the application version

    Returns:
        JSON object describing the created app version on success. None on failure.

    Raises:
        Exception: on any failure occured during application version creation.
    '''

    ## Create new application version with label
    create_app_version_response = boto3_eb_client.create_application_version(
        ApplicationName=eb_app_name,
        VersionLabel=version_label,
        SourceBundle=source_bundle,
        Process=True,
        Tags=tags
    )

    application_version_status: str = create_app_version_response['ApplicationVersion']['Status']
    application_version_status = application_version_status.lower()

    # Wait for application version to be fully processed and validated
    TIMEOUT = 120
    INTERVAL = 10
    walltime = 0
    while application_version_status in ['processing', 'building'] and walltime < TIMEOUT:
        sleep(INTERVAL)
        walltime += INTERVAL

        application_version_status = get_eb_app_version_status(eb_app_name=eb_app_name, version_label=version_label)

    if walltime >= TIMEOUT:
        raise Exception('EB app version failed to report creation completion before timeout.')
    elif application_version_status == 'failed':
        raise Exception('EB app version creation failed.')
    elif application_version_status != 'processed':
        raise Exception(f'Unexpected EB app version status "{application_version_status}" reported.')
    else:
        return describe_app_version(version_label=version_label, eb_app_name=eb_app_name)
