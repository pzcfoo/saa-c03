
import { Construct } from 'constructs';
import {
    StackProps,
    Stack,
    CfnOutput,
    aws_route53_targets as targets,
    aws_route53 as r53,
    aws_certificatemanager as acm,
    aws_lambda as lambda,
    aws_apigateway as apigateway,
} from 'aws-cdk-lib'
// import * as sqs from 'aws-cdk-lib/aws-sqs';

export class ApiCustomDnsStack extends Stack {
    constructor(scope: Construct, id: string, props?: StackProps) {
        super(scope, id, props);

        // reflet the existing certificate
        const domainCert = acm.Certificate.fromCertificateArn(
            this,
            'cert', "arn:aws:acm:us-east-1:xxxxxxxxxx:certificate/aaaaaaaaa-bbbb-bbbb-ccccccccc"
        )
        const api = new apigateway.LambdaRestApi(this, 'test-api', {
            domainName: {
                domainName: "test.yoloswag.org",
                certificate: domainCert,
            },
            endpointTypes: [apigateway.EndpointType.REGIONAL],
            handler: new lambda.Function(this, 'hello-world-lambda', {
                handler: 'index.handler',
                code: lambda.Code.fromInline(
                    `
                    exports.handler = async (event, context, callback) => {
                        var res = {statusCode: 200, headers: {'Content-Type': "*/*"}, body: "hi"}
                        callback(null, res);
                    };
                    `
                ),
                runtime: lambda.Runtime.NODEJS_16_X,
            })
        });


        const hostedZone = r53.HostedZone.fromLookup(this, 'test-hosted-zone', { domainName: 'yoloswag.org' });
        const record = new r53.ARecord(this, 'test-a-record', {
            zone: hostedZone,
            recordName: "test.yoloswag.org",
            target: r53.RecordTarget.fromAlias(new targets.ApiGateway(api)),
        })
        new CfnOutput(this, "api-url", { value: api.url })
    }
}
