import { Construct } from 'constructs';
import {
    StackProps,
    Stack,
    CfnOutput,
    aws_iam as iam,
    aws_route53_targets as targets,
    aws_route53 as r53,
    aws_certificatemanager as acm,
    aws_lambda as lambda,
    aws_apigateway as apigateway,
} from 'aws-cdk-lib'

export class ProtectedApiCustomDnsStack extends Stack {
    constructor(scope: Construct, id: string, props?: StackProps) {
        super(scope, id, props);

        const apiAccessRole = new iam.Role(
            this, 'api-access-role', {
            assumedBy: new iam.ArnPrincipal("arn:aws:iam::736962679244:user/test"),
        });

        const hostedZone = r53.HostedZone.fromLookup(this, 'test-hosted-zone', { domainName: 'yoloswag.org' });
        // create TLS certificate
        const cert = new acm.Certificate(this, 'test-cert', {
            domainName: 'test.yoloswag.org',
            validation: acm.CertificateValidation.fromDns(hostedZone),
        });

        const lambdaFunc = new lambda.Function(this, 'hello-world-lambda', {
            handler: 'index.handler',
            code: lambda.Code.fromInline(
                `
                exports.handler = async (event, context, callback) => {
                    var res = {statusCode: 200, headers: {'Content-Type': "*/*"}, body: event.pathParameters.project_id}
                    callback(null, res);
                };
                `
            ),
            runtime: lambda.Runtime.NODEJS_16_X,
        });
        const api = new apigateway.RestApi(this, 'test-api', {
            domainName: {
                domainName: "test.yoloswag.org",
                certificate: cert,
            },
            endpointTypes: [apigateway.EndpointType.REGIONAL],
            policy: new iam.PolicyDocument({
                statements: [
                    new iam.PolicyStatement({
                        actions: ["execute-api:Invoke"],
                        effect: iam.Effect.DENY,
                        notPrincipals: [
                            new iam.ArnPrincipal(apiAccessRole.roleArn)
                        ],
                    })
                ]
            })
        });

        const testResource = api.root.addResource("test");
        const projectSpecificResource = testResource.addResource("{project_id}")
        projectSpecificResource.addMethod(
            "GET",
            new apigateway.LambdaIntegration(lambdaFunc),
            {
                authorizationType: apigateway.AuthorizationType.IAM,
            }
        );

        // set up DNS A record & associate with api
        new r53.ARecord(this, 'test-a-record', {
            zone: hostedZone,
            recordName: "test.yoloswag.org",
            target: r53.RecordTarget.fromAlias(new targets.ApiGateway(api)),
        });

        const statement = new iam.PolicyStatement({
            actions: ["execute-api:Invoke"],
            effect: iam.Effect.ALLOW,
            resources: [api.arnForExecuteApi()]
        });
        apiAccessRole.addToPolicy(statement);

        new CfnOutput(this, 'api-end-point', { value: api.urlForPath("/test") });
        new CfnOutput(this, 'api-arn', { value: api.arnForExecuteApi() });
        new CfnOutput(this, 'role-for-api', { value: apiAccessRole.roleName });
        new CfnOutput(this, 'role-for-api-arn', { value: apiAccessRole.roleArn });
    }
}
