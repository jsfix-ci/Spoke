import { gql } from "@apollo/client";
import PropTypes from "prop-types";
import React from "react";
import { withRouter } from "react-router-dom";
import { compose } from "recompose";

import { loadData } from "../hoc/with-operations";
import AssignmentTexter from "./components/AssignmentTexter";

// TODO: use Fragment
const contactDataFragment = `
        id
        assignmentId
        firstName
        lastName
        cell
        zip
        external_id
        customFields
        optOut {
          id
        }
        questionResponseValues {
          interactionStepId
          value
        }
        location {
          city
          state
        }
        timezone
        messageStatus
        messages {
          id
          createdAt
          text
          isFromContact
        }
        contactTags {
          id
          title
          description
          confirmationSteps
          isAssignable
          isSystem
          createdAt
        }
`;

class TexterTodo extends React.Component {
  UNSAFE_componentWillMount() {
    const { assignment } = this.props.data;
    this.assignContactsIfNeeded();
    if (!assignment || assignment.campaign.isArchived) {
      const { organizationId } = this.props.match.params;
      this.props.history.push(`/app/${organizationId}/todos`);
    }
  }

  assignContactsIfNeeded = async (checkServer = false) => {
    const { assignment } = this.props.data;
    const { contacts } = this.props.contacts.assignment;
    if (contacts.length === 0 || checkServer) {
      if (assignment.campaign.useDynamicAssignment) {
        const didAddContacts = (
          await this.props.mutations.findNewCampaignContact(assignment.id, 1)
        ).data.findNewCampaignContact.found;
        if (didAddContacts) {
          this.props.contacts.refetch();
          return;
        }
      }
      const { organizationId } = this.props.match.params;
      this.props.history.push(`/app/${organizationId}/todos`);
    }
  };

  loadContacts = async (contactIds) =>
    this.props.mutations.getAssignmentContacts(contactIds);

  refreshData = () => {
    this.props.data.refetch();
  };

  render() {
    const { assignment } = this.props.data;
    const { organizationId } = this.props.match.params;
    const { contacts, allContactsCount } = this.props.contacts.assignment;
    const contactIds = contacts.map((contact) => contact.id);

    return (
      <AssignmentTexter
        assignment={assignment}
        contactIds={contactIds}
        allContactsCount={allContactsCount}
        assignContactsIfNeeded={this.assignContactsIfNeeded}
        refreshData={this.refreshData}
        loadContacts={this.loadContacts}
        onRefreshAssignmentContacts={this.refreshAssignmentContacts}
        organizationId={organizationId}
      />
    );
  }
}

TexterTodo.propTypes = {
  match: PropTypes.object.isRequired,
  history: PropTypes.object.isRequired,
  data: PropTypes.object,
  mutations: PropTypes.object
};

const queries = {
  data: {
    query: gql`
      query getTexterAssignmentData($assignmentId: String!) {
        assignment(id: $assignmentId) {
          id
          userCannedResponses {
            id
            title
            text
            isUserCreated
          }
          campaignCannedResponses {
            id
            title
            text
            isUserCreated
          }
          texter {
            id
            firstName
            lastName
            assignedCell
          }
          campaign {
            id
            title
            isArchived
            useDynamicAssignment
            timezone
            textingHoursStart
            textingHoursEnd
            organization {
              id
              threeClickEnabled
              optOutMessage
            }
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
            interactionSteps {
              id
              parentInteractionId
              scriptOptions
              question {
                text
                answerOptions {
                  value
                  nextInteractionStep {
                    id
                    scriptOptions
                  }
                }
              }
            }
          }
        }
      }
    `,
    options: (ownProps) => ({
      variables: {
        assignmentId: ownProps.match.params.assignmentId
      },
      pollInterval: 20000
    })
  },
  contacts: {
    query: gql`
      query getTexterAssignmentContactIds(
        $assignmentId: String!
        $contactsFilter: ContactsFilter!
      ) {
        assignment(id: $assignmentId) {
          id
          contacts(contactsFilter: $contactsFilter) {
            id
          }
          allContactsCount: contactsCount
        }
      }
    `,
    options: (ownProps) => ({
      variables: {
        contactsFilter: {
          messageStatus: ownProps.messageStatus,
          isOptedOut: false,
          validTimezone: true
        },
        assignmentId: ownProps.match.params.assignmentId
      },
      fetchPolicy: "network-only"
    })
  }
};

const mutations = {
  findNewCampaignContact: (_ownProps) => (
    assignmentId,
    numberContacts = 1
  ) => ({
    mutation: gql`
      mutation findNewCampaignContact(
        $assignmentId: String!
        $numberContacts: Int!
      ) {
        findNewCampaignContact(
          assignmentId: $assignmentId
          numberContacts: $numberContacts
        ) {
          found
        }
      }
    `,
    variables: {
      assignmentId,
      numberContacts
    }
  }),
  getAssignmentContacts: (ownProps) => (contactIds, findNew) => ({
    mutation: gql`
      mutation getAssignmentContacts($assignmentId: String!, $contactIds: [String]!, $findNew: Boolean) {
        getAssignmentContacts(assignmentId: $assignmentId, contactIds: $contactIds, findNew: $findNew) {
          ${contactDataFragment}
        }
      }
    `,
    variables: {
      assignmentId: ownProps.match.params.assignmentId,
      contactIds,
      findNew: !!findNew
    }
  })
};

export default compose(
  withRouter,
  loadData({
    queries,
    mutations
  })
)(TexterTodo);
