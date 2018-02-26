interface Parameter {
    name: string;
    scope: 'local' | 'scope';
}

interface TestStepColumn {
    id: string;
    params: Array<Parameter>;
}

type TestCase = {
    project: string,
    testcase_id: string;
    title: string;
    description: string;
    teststeps: Array<Array<TestStepColumn>>;
};

export interface TextMessage {
    op: string;
    type: string;
    tag: string;
    data: string;  // FIXME: This is really ugly, but I have to fix this in java first.  SHould be generic
    ack: boolean;
}

export const templateXML = (args: TestCase) => `
<testcases  project-id="${args.project}">
  <testcase id="${args.testcase_id}">
    <title>${args.title}</title>
    <description>${args.description}</description>
    <test-steps>
        <test-step>
            <test-step-column id="step">
                <parameter name="bugzilla" scope="local"/>
                <parameter name="bashCommand" scope="local"/>
                <parameter name="expectedCompletions" scope="local"/>
            </test-step-column>
        </test-step>
    </test-steps>
    <custom-fields>
        <custom-field id="caseautomation" content="automated"></custom-field>
        <custom-field id="caseimportance" content="high"></custom-field>
        <custom-field id="caselevel" content="component"></custom-field>
        <custom-field id="caseposneg" content="positive"></custom-field>
        <custom-field id="tags" content="Tier1"></custom-field>
        <custom-field id="casecomponent" content="subscription-manager"></custom-field>
        <custom-field id="testtype" content="functional"></custom-field>
        <custom-field id="subtype1" content="reliability"></custom-field>
        <custom-field id="subtype2" content="-"></custom-field>
    </custom-fields>
  </testcase>
</testcases>
`;

export const defaultXml: string = `
<testcases  project-id="PLATTP">
  <testcase id="">
    <title>RHSM-TC : rhsm.cli.tests.BashCompletionTests.testBashCompletion</title>
    <description>when subscription-manager is run with no args, it should default to the help report</description>
    <test-steps>
        <test-step>
            <test-step-column id="step">
                <parameter name="bugzilla" scope="local"/>
                <parameter name="bashCommand" scope="local"/>
                <parameter name="expectedCompletions" scope="local"/>
            </test-step-column>
        </test-step>
    </test-steps>
    <custom-fields>
        <custom-field id="caseautomation" content="automated"></custom-field>
        <custom-field id="caseimportance" content="high"></custom-field>
        <custom-field id="caselevel" content="component"></custom-field>
        <custom-field id="caseposneg" content="positive"></custom-field>
        <custom-field id="tags" content="Tier1"></custom-field>
        <custom-field id="casecomponent" content="subscription-manager"></custom-field>
        <custom-field id="testtype" content="functional"></custom-field>
        <custom-field id="subtype1" content="reliability"></custom-field>
        <custom-field id="subtype2" content="-"></custom-field>
    </custom-fields>
  </testcase>
</testcases>`;

export const defaultMapping = `
{
    "com.github.redhatqe.rhsm.testpolarize.TestPolarize.testMethod" : {
      "PLATTP" : {
        "id" : "PLATTP-10069",
        "parameters" : [ ]
      }
    },
    "com.github.redhatqe.rhsm.testpolarize.TestPolarize.yetAnotherTestMethod" : {
      "PLATTP" : {
        "id" : "PLATTP-10549",
        "parameters" : [ ]
      }
    },
    "com.github.redhatqe.rhsm.testpolarize.TestReq.testBadProjectToTestCaseID" : {
      "PLATTP" : {
        "id" : "PLATTP-10202",
        "parameters" : [ ]
      }
    },
    "com.github.redhatqe.rhsm.testpolarize.TestReq.testError" : {
      "PLATTP" : {
        "id" : "PLATTP-10203",
        "parameters" : [ ]
      }
    },
    "com.github.redhatqe.rhsm.testpolarize.TestReq.testTestDefinition" : {
      "PLATTP" : {
        "id" : "PLATTP-10547",
        "parameters" : [ ]
      }
    },
    "com.github.redhatqe.rhsm.testpolarize.TestReq.testUpgrade" : {
      "PLATTP" : {
        "id" : "PLATTP-10068",
        "parameters" : [ "name", "age" ]
      }
    },
    "com.github.redhatqe.rhsm.testpolarize.TestReq.testUpgradeNegative" : {
      "PLATTP" : {
        "id" : "PLATTP-9520",
        "parameters" : [ "name", "age" ]
      }
    }
}`;

export const makeRequest = ( op: string
                           , type: string
                           , tag: string
                           , data: {}
                           , ack: boolean = true): TextMessage => {
    return {
        op: op,
        type: type,
        tag: tag,
        ack: ack,
        data: JSON.stringify(data, null, 2)
    };
};
