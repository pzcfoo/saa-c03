import { Construct } from 'constructs';
import {
    StackProps,
    Stack,
    SecretValue,
    RemovalPolicy,
    aws_iam as iam,
    aws_s3 as s3,
} from 'aws-cdk-lib'
// import * as sqs from 'aws-cdk-lib/aws-sqs';

export class SaaC03Stack extends Stack {
    constructor(scope: Construct, id: string, props?: StackProps) {
        super(scope, id, props);

        const catPicsBucket = new s3.Bucket(
            this, 'cat-pics-bucket',
            {
                removalPolicy: RemovalPolicy.DESTROY,
                publicReadAccess: false,
            }
        )
        const animalPicsBucket = new s3.Bucket(
            this, 'animal-pics-bucket',
            {
                removalPolicy: RemovalPolicy.DESTROY,
                publicReadAccess: false,
            }
        )
        const userPolicy = new iam.ManagedPolicy(
            this, "user-policy",
            {
                statements: [
                    new iam.PolicyStatement(
                        {
                            sid: "AllowS3",
                            actions: ["s3:*"],
                            resources: ["arn:aws:s3:::*"],
                            effect: iam.Effect.ALLOW,
                        }
                    ),
                    new iam.PolicyStatement(
                        {
                            sid: "DenyCatPicsS3",
                            actions: ["s3:*"],
                            resources: [catPicsBucket.bucketArn],
                            effect: iam.Effect.DENY,
                        }
                    )
                ]
            }
        )

        const devGroup = new iam.Group(
            this, "dev-group",
            {
                groupName: "developers",
                managedPolicies: [
                    iam.ManagedPolicy.fromAwsManagedPolicyName("IAMUserChangePassword"),
                    userPolicy,
                ]
            }
        )

        const sally = new iam.User(
            this, 'sally',
            {
                password: SecretValue.unsafePlainText("Harryp0tter!"),
                passwordResetRequired: true,
                groups: [devGroup]
            }
        )
    }
}
