
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

        const hostedZone = r53.HostedZone.fromLookup(this, 'test-hosted-zone', { domainName: 'yoloswag.org' });

        // create certificate
        const cert = new acm.Certificate(this, 'test-cert', {
            domainName: 'test.yoloswag.org',
            validation: acm.CertificateValidation.fromDns(hostedZone),
        });

        const api = new apigateway.LambdaRestApi(this, 'test-api', {
            domainName: {
                domainName: "test.yoloswag.org",
                certificate: cert,
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

        new r53.ARecord(this, 'test-a-record', {
            zone: hostedZone,
            recordName: "test.yoloswag.org",
            target: r53.RecordTarget.fromAlias(new targets.ApiGateway(api)),
        })
        new CfnOutput(this, "api-url", { value: api.url });
    }
}
