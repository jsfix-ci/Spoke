import type { ApolloQueryResult } from "@apollo/client";
import { gql } from "@apollo/client";
import Button from "@material-ui/core/Button";
import CreateIcon from "@material-ui/icons/Create";
import isEqual from "lodash/isEqual";
import uniqBy from "lodash/uniqBy";
import React from "react";
import { compose } from "recompose";

import type { CampaignVariablePage } from "../../../../api/campaign-variable";
import type { CannedResponse } from "../../../../api/canned-response";
import { LargeList } from "../../../../components/LargeList";
import { dataTest } from "../../../../lib/attributes";
import type { MutationMap, QueryMap } from "../../../../network/types";
import { loadData } from "../../../hoc/with-operations";
import CampaignFormSectionHeading from "../../components/CampaignFormSectionHeading";
import type {
  FullComponentProps,
  RequiredComponentProps
} from "../../components/SectionWrapper";
import { asSection } from "../../components/SectionWrapper";
import CannedResponseDialog from "./components/CannedResponseDialog";
import CannedResponseRow from "./components/CannedResponseRow";
import { ResponseEditorContext } from "./interfaces";

interface Values {
  cannedResponses: CannedResponse[];
}

interface HocProps {
  mutations: {
    editCampaign(payload: Values): ApolloQueryResult<any>;
  };
  data: {
    campaign: {
      id: string;
      cannedResponses: CannedResponse[];
      campaignVariables: CampaignVariablePage;
      isStarted: boolean;
      customFields: string[];
      externalSystem: { id: string } | null;
    };
  };
}

interface InnerProps extends FullComponentProps, HocProps {}

interface State {
  cannedResponsesToAdd: CannedResponse[];
  cannedResponseIdsToDelete: string[];
  editedCannedResponses: CannedResponse[];
  editingResponse?: CannedResponse;
  isWorking: boolean;
  shouldShowEditor: boolean;
}

class CampaignCannedResponsesForm extends React.Component<InnerProps, State> {
  state: State = {
    cannedResponsesToAdd: [],
    cannedResponseIdsToDelete: [],
    editedCannedResponses: [],
    isWorking: false,
    shouldShowEditor: false
  };

  pendingCannedResponses = () => {
    const {
      cannedResponsesToAdd,
      cannedResponseIdsToDelete,
      editedCannedResponses
    } = this.state;
    const { cannedResponses } = this.props.data.campaign;
    const newCannedResponses = cannedResponses
      .filter((response) => !cannedResponseIdsToDelete.includes(response.id))
      .concat(cannedResponsesToAdd)
      .map((response) => {
        const editedResponse = editedCannedResponses.find(
          ({ id }) => id === response.id
        );
        return editedResponse || response;
      });

    const didChange = !isEqual(cannedResponses, newCannedResponses);
    return { cannedResponses: newCannedResponses, didChange };
  };

  handleSubmit = async () => {
    const { editCampaign } = this.props.mutations;
    const { cannedResponses, didChange } = this.pendingCannedResponses();

    if (!didChange) return;

    this.setState({ isWorking: true });
    try {
      const response = await editCampaign({ cannedResponses });
      if (response.errors) throw response.errors;
      this.setState({
        cannedResponsesToAdd: [],
        cannedResponseIdsToDelete: []
      });
    } catch (err) {
      this.props.onError(err.message);
    } finally {
      this.setState({ isWorking: false });
    }
  };

  handleOnSaveResponse = (response: CannedResponse) => {
    const newId = Math.random()
      .toString(36)
      .replace(/[^a-zA-Z1-9]+/g, "");
    const cannedResponsesToAdd = this.state.cannedResponsesToAdd.concat({
      ...response,
      id: newId
    });
    this.setState({ cannedResponsesToAdd, shouldShowEditor: false });
  };

  createHandleOnDelete = (responseId: string) => () => {
    const cannedResponsesToAdd = this.state.cannedResponsesToAdd.filter(
      (response) => response.id !== responseId
    );
    const cannedResponseIdsToDelete = [
      ...new Set(this.state.cannedResponseIdsToDelete).add(responseId)
    ];
    this.setState({
      cannedResponsesToAdd,
      cannedResponseIdsToDelete
    });
  };

  makeHandleToggleResponseDialog = (responseId = "") => () => {
    const { cannedResponses } = this.pendingCannedResponses();
    const editingResponse = cannedResponses.find(
      (res) => res.id === responseId
    );
    this.setState({ shouldShowEditor: true, editingResponse });
  };

  // save edits to a canned response
  handleOnSaveResponseEdit = (formValues: any) => {
    const { editingResponse, editedCannedResponses } = this.state;
    if (editingResponse === undefined) return;

    const editedResponse = { ...editingResponse, ...formValues };
    const newResponses = uniqBy(
      [editedResponse, ...editedCannedResponses],
      (response) => response.id
    );

    this.setState({
      editedCannedResponses: newResponses,
      editingResponse: undefined,
      shouldShowEditor: false
    });
  };

  // cancel editing and creating canned responses
  handleOnCancelResponseEdit = () => {
    this.setState({ editingResponse: undefined, shouldShowEditor: false });
  };

  scriptVariables = () => {
    const {
      data: {
        campaign: {
          customFields,
          campaignVariables: { edges: campaignVariableEdges }
        }
      }
    } = this.props;

    const campaignVariables = campaignVariableEdges.map(({ node }) => node);

    return { customFields, campaignVariables };
  };

  renderCannedResponseDialog() {
    const { shouldShowEditor, editingResponse } = this.state;
    const {
      data: {
        campaign: { externalSystem }
      }
    } = this.props;

    const { customFields, campaignVariables } = this.scriptVariables();

    const context = editingResponse
      ? ResponseEditorContext.EditingResponse
      : ResponseEditorContext.CreatingResponse;
    const onSave = editingResponse
      ? this.handleOnSaveResponseEdit
      : this.handleOnSaveResponse;

    return (
      <CannedResponseDialog
        open={shouldShowEditor}
        context={context}
        customFields={customFields}
        campaignVariables={campaignVariables}
        integrationSourced={externalSystem !== null}
        editingResponse={editingResponse!}
        onCancel={this.handleOnCancelResponseEdit}
        onSave={onSave}
      />
    );
  }

  render() {
    const { isWorking, shouldShowEditor } = this.state;
    const { isNew, saveLabel } = this.props;

    const {
      cannedResponses,
      didChange: hasPendingChanges
    } = this.pendingCannedResponses();
    const isSaveDisabled = isWorking || (!isNew && !hasPendingChanges);
    const finalSaveLabel = isWorking ? "Working..." : saveLabel;

    const { customFields, campaignVariables } = this.scriptVariables();

    return (
      <div>
        <CampaignFormSectionHeading
          title="Canned responses for texters"
          subtitle="Save some scripts for your texters to use to answer additional FAQs that may come up outside of the survey questions and scripts you already set up."
        />
        {cannedResponses.length > 0 ? (
          <LargeList>
            {cannedResponses.map((cannedResponse) => (
              <CannedResponseRow
                key={cannedResponse.id}
                cannedResponse={cannedResponse}
                customFields={customFields}
                campaignVariables={campaignVariables}
                onDelete={this.createHandleOnDelete(cannedResponse.id)}
                onToggleResponseEditor={this.makeHandleToggleResponseDialog(
                  cannedResponse.id
                )}
              />
            ))}
          </LargeList>
        ) : (
          <p>No canned responses</p>
        )}
        <hr />
        {this.renderCannedResponseDialog()}
        {!shouldShowEditor && (
          <Button
            {...dataTest("newCannedResponse")}
            color="secondary"
            endIcon={<CreateIcon />}
            onClick={this.makeHandleToggleResponseDialog()}
          >
            Add new canned response
          </Button>
        )}
        <br />
        <Button
          variant="contained"
          disabled={isSaveDisabled}
          onClick={this.handleSubmit}
        >
          {finalSaveLabel}
        </Button>
      </div>
    );
  }
}

const queries: QueryMap<InnerProps> = {
  data: {
    query: gql`
      query getCampaignBasics($campaignId: String!) {
        campaign(id: $campaignId) {
          id
          cannedResponses {
            id
            title
            text
          }
          isStarted
          isApproved
          customFields
          campaignVariables {
            edges {
              node {
                id
                name
                value
              }
            }
          }
          externalSystem {
            id
          }
        }
      }
    `,
    options: (ownProps) => ({
      variables: {
        campaignId: ownProps.campaignId
      }
    })
  }
};

const mutations: MutationMap<InnerProps> = {
  editCampaign: (ownProps) => (payload: Values) => ({
    mutation: gql`
      mutation editCampaignCannedResponses(
        $campaignId: String!
        $payload: CampaignInput!
      ) {
        editCampaign(id: $campaignId, campaign: $payload) {
          id
          cannedResponses {
            id
            title
            text
          }
          isStarted
          isApproved
          customFields
          readiness {
            id
            basics
          }
        }
      }
    `,
    variables: {
      campaignId: ownProps.campaignId,
      payload
    }
  })
};

export default compose<InnerProps, RequiredComponentProps>(
  asSection({
    title: "Canned Responses",
    readinessName: "cannedResponses",
    jobQueueNames: [],
    expandAfterCampaignStarts: true,
    expandableBySuperVolunteers: true
  }),
  loadData({
    queries,
    mutations
  })
)(CampaignCannedResponsesForm);
