import boto3
import requests

from botocore.auth import SigV4Auth
from botocore.awsrequest import AWSRequest
from botocore.compat import parse_qsl, urlparse


class IAMAuth(requests.auth.AuthBase):
    """
    https://github.com/boto/boto3/issues/1246#issuecomment-698885175
    """
    
    def __init__(self, boto3_session=None, service_name='execute-api'):
        self.boto3_session = boto3_session or boto3.Session()

        self.sigv4 = SigV4Auth(
            credentials=self.boto3_session.get_credentials(),
            service_name=service_name,
            region_name=self.boto3_session.region_name
        )

    def __call__(self, request):
        url = urlparse(request.url)

        # prepare request for AWS
        aws_request = AWSRequest(
            method=request.method,
            url=f'{url.scheme}://{url.netloc}{url.path}',
            data=request.body,
            params=dict(parse_qsl(url.query))
        )

        # sign request
        self.sigv4.add_auth(aws_request)

        # re add original headers
        for key, val in request.headers.items():
            if key not in aws_request.headers:
                aws_request.headers[key] = val

        return aws_request.prepare()


if __name__ == '__main__':
    TEST_PROFILE = "pfoo-gen-test"
    sesh = boto3.Session(profile_name=TEST_PROFILE)

    # Test the correct account can assume the special role for accessing the API
    sts_client = sesh.client("sts")
    assumed_role_creds = sts_client.assume_role(
        RoleArn="arn:aws:iam::736962679244:role/ProtectedApiStack-apiaccessrole3DD5D35D-14VYZ6N2MA3CI",
        RoleSessionName="test-session-1",
    )
    
    boto_sesh = boto3.Session(
        aws_access_key_id=assumed_role_creds['Credentials']['AccessKeyId'],
        aws_secret_access_key=assumed_role_creds['Credentials']["SecretAccessKey"],
        aws_session_token=assumed_role_creds['Credentials']["SessionToken"],
        region_name='us-east-1'
    )
    session = requests.Session()
    session.auth = IAMAuth(boto3_session=boto_sesh)
    a = session.get('https://test.yoloswag.org/test/1234')
    print(a.text)
    print()
    print()

    b = session.get('https://test.yoloswag.org/test/111')
    print(b.text)
    print()
    print()

    # Test the wrong account can't assume the role
    sesh_b = boto3.Session(profile_name=TEST_PROFILE)

    # Test access without assuming role
    session = requests.Session()
    session.auth = IAMAuth(boto3_session=sesh_b)
    a = session.get('https://test.yoloswag.org/test/1234')
    print(a.text)
    print()
    print()


    # test cannot assume role, this should raise
    sesh_c = boto3.Session(profile_name="pfoo-gen-admin")
    sts_client_c = sesh_c.client("sts")
    assumed_role_creds = sts_client_c.assume_role(
        RoleArn="arn:aws:iam::736962679244:role/ProtectedApiStack-apiaccessrole3DD5D35D-14VYZ6N2MA3CI",
        RoleSessionName="test-session-1",
    )

