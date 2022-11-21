import { gql } from "@apollo/client";
import Button from "@material-ui/core/Button";
import Dialog from "@material-ui/core/Dialog";
import DialogActions from "@material-ui/core/DialogActions";
import DialogContent from "@material-ui/core/DialogContent";
import DialogTitle from "@material-ui/core/DialogTitle";
import CreateIcon from "@material-ui/icons/Create";
import FileCopyIcon from "@material-ui/icons/FileCopyOutlined";
import SpeedDial from "@material-ui/lab/SpeedDial";
import SpeedDialAction from "@material-ui/lab/SpeedDialAction";
import SpeedDialIcon from "@material-ui/lab/SpeedDialIcon";
import { TextField, Toggle } from "material-ui";
import DropDownMenu from "material-ui/DropDownMenu";
import { MenuItem } from "material-ui/Menu";
import PropTypes from "prop-types";
import React from "react";
import { withRouter } from "react-router-dom";
import { compose } from "recompose";

import CreateCampaignFromTemplateDialog from "../components/CreateCampaignFromTemplateDialog";
import LoadingIndicator from "../components/LoadingIndicator";
import theme from "../styles/theme";
import { withAuthzContext } from "./AuthzProvider";
import CampaignList from "./CampaignList";
import { loadData } from "./hoc/with-operations";

const styles = {
  flexContainer: {
    display: "flex",
    alignItems: "baseline",
    justifyContent: "space-between",
    padding: 5
  }
};

// The campaign list uses infinite scrolling now so we fix the page size
const DEFAULT_PAGE_SIZE = 10;

class AdminCampaignList extends React.Component {
  state = {
    speedDialOpen: false,
    createFromTemplateOpen: false,
    isCreating: false,
    campaignsFilter: {
      isArchived: false
    },
    releasingInProgress: false,
    releasingAllReplies: false,
    releaseAllRepliesError: undefined,
    releaseAllRepliesResult: undefined
  };

  handleClickNewButton = async () => {
    const { history, match } = this.props;
    const { organizationId } = match.params;
    this.setState({ isCreating: true });
    const newCampaign = await this.props.mutations.createCampaign({
      title: "New Campaign",
      description: "",
      dueBy: null,
      organizationId,
      interactionSteps: {
        scriptOptions: [""]
      }
    });
    if (newCampaign.errors) {
      alert("There was an error creating your campaign");
      throw new Error(newCampaign.errors);
    }

    const { id: campaignId } = newCampaign.data.createCampaign;
    history.push(
      `/admin/${organizationId}/campaigns/${campaignId}/edit?new=true`
    );
  };

  handleFilterChange = (event, index, value) => {
    this.setState({
      campaignsFilter: {
        isArchived: value
      }
    });
  };

  startReleasingAllReplies = () => {
    this.setState({ releasingAllReplies: true });
  };

  closeReleasingAllReplies = () => {
    this.setState({
      releasingInProgress: false,
      releasingAllReplies: false,
      releaseAllRepliesError: undefined,
      releaseAllRepliesResult: undefined
    });
  };

  releaseAllReplies = () => {
    const ageInHours = parseFloat(this.numberOfHoursToReleaseRef.input.value);
    const releaseOnRestricted = this.releaseOnRestrictedRef.state.switched;
    const limitToCurrentlyTextableContacts = this
      .limitToCurrentlyTextableContactsRef.state.switched;

    this.setState({ releasingInProgress: true });

    this.props.mutations
      .releaseAllUnhandledReplies(
        this.props.match.params.organizationId,
        ageInHours,
        releaseOnRestricted,
        limitToCurrentlyTextableContacts
      )
      .then((result) => {
        if (result.errors) {
          throw result.errors;
        }

        this.setState({
          releaseAllRepliesResult: result.data.releaseAllUnhandledReplies,
          releasingInProgress: false
        });
      })
      .catch((error) => {
        this.setState({
          releaseAllRepliesError: error,
          releasingInProgress: false
        });
      });
  };

  renderFilters() {
    return (
      <DropDownMenu
        value={this.state.campaignsFilter.isArchived}
        onChange={this.handleFilterChange}
      >
        <MenuItem value={false} primaryText="Current" />
        <MenuItem value primaryText="Archived" />
      </DropDownMenu>
    );
  }

  render() {
    const {
      campaignsFilter,
      releasingAllReplies,
      releasingInProgress
    } = this.state;

    const doneReleasingReplies =
      this.state.releaseAllRepliesResult || this.state.releaseAllRepliesError;

    const { organizationId } = this.props.match.params;
    const { isAdmin } = this.props;
    return (
      <div>
        <div style={styles.flexContainer}>
          {this.renderFilters()}
          <Button
            variant="contained"
            color="primary"
            onClick={this.startReleasingAllReplies}
          >
            Release All Unhandled Replies
          </Button>
        </div>
        {releasingAllReplies && (
          <Dialog open onClose={this.closeReleasingAllReplies}>
            <DialogTitle>Release All Unhandled Replies</DialogTitle>
            <DialogContent>
              {releasingInProgress ? (
                <LoadingIndicator />
              ) : this.state.releaseAllRepliesError ? (
                <span>
                  Error: {JSON.stringify(this.state.releaseAllRepliesError)}
                </span>
              ) : this.state.releaseAllRepliesResult ? (
                <span>
                  Released {this.state.releaseAllRepliesResult.contactCount}{" "}
                  replies on {this.state.releaseAllRepliesResult.campaignCount}{" "}
                  campaigns
                </span>
              ) : !doneReleasingReplies ? (
                <div>
                  How many hours ago should a conversation have been idle for it
                  to be unassigned?
                  <TextField
                    type="number"
                    floatingLabelText="Number of Hours"
                    ref={(el) => {
                      this.numberOfHoursToReleaseRef = el;
                    }}
                    defaultValue={1}
                  />
                  <br />
                  <br />
                  Should we release replies on campaigns that are restricted to
                  teams? If unchecked, replies on campaigns restricted to team
                  members will stay assigned to their current texter.
                  <Toggle
                    ref={(el) => {
                      this.releaseOnRestrictedRef = el;
                    }}
                    defaultToggled={false}
                  />
                  <br />
                  <br />
                  Release contacts only if it is within texting hours in the
                  contact's timezone? If unchecked, replies will be released for
                  contacts that may not be textable until later today or until
                  tomorrow.
                  <Toggle
                    ref={(el) => {
                      this.limitToCurrentlyTextableContactsRef = el;
                    }}
                    defaultToggled
                  />
                </div>
              ) : (
                <div />
              )}
            </DialogContent>
            <DialogActions>
              {releasingInProgress
                ? []
                : doneReleasingReplies
                ? [
                    <Button
                      key="done"
                      variant="contained"
                      onClick={this.closeReleasingAllReplies}
                    >
                      Done
                    </Button>
                  ]
                : [
                    <Button
                      key="cancel"
                      variant="contained"
                      onClick={this.closeReleasingAllReplies}
                    >
                      Cancel
                    </Button>,
                    <Button
                      key="release"
                      variant="contained"
                      color="primary"
                      onClick={this.releaseAllReplies}
                    >
                      Release
                    </Button>
                  ]}
            </DialogActions>
          </Dialog>
        )}
        {this.state.isCreating ? (
          <LoadingIndicator />
        ) : (
          <CampaignList
            organizationId={organizationId}
            campaignsFilter={campaignsFilter}
            pageSize={DEFAULT_PAGE_SIZE}
            isAdmin={isAdmin}
          />
        )}

        {isAdmin ? (
          <SpeedDial
            ariaLabel="SpeedDial example"
            style={theme.components.floatingButton}
            icon={<SpeedDialIcon />}
            onClose={() => this.setState({ speedDialOpen: false })}
            onOpen={() => this.setState({ speedDialOpen: true })}
            open={this.state.speedDialOpen}
            direction="up"
          >
            <SpeedDialAction
              icon={<CreateIcon />}
              tooltipTitle="Create Blank"
              onClick={this.handleClickNewButton}
            />
            <SpeedDialAction
              icon={<FileCopyIcon />}
              tooltipTitle="Create from Template"
              onClick={() => this.setState({ createFromTemplateOpen: true })}
            />
          </SpeedDial>
        ) : null}
        <CreateCampaignFromTemplateDialog
          organizationId={organizationId}
          open={this.state.createFromTemplateOpen}
          onClose={() => this.setState({ createFromTemplateOpen: false })}
        />
      </div>
    );
  }
}

AdminCampaignList.propTypes = {
  match: PropTypes.object,
  history: PropTypes.object,
  mutations: PropTypes.object,
  isAdmin: PropTypes.bool.isRequired
};

const mutations = {
  createCampaign: (_ownProps) => (campaign) => ({
    mutation: gql`
      mutation createBlankCampaign($campaign: CampaignInput!) {
        createCampaign(campaign: $campaign) {
          id
        }
      }
    `,
    variables: { campaign }
  }),
  releaseAllUnhandledReplies: (_ownProps) => (
    organizationId,
    ageInHours,
    releaseOnRestricted,
    limitToCurrentlyTextableContacts
  ) => ({
    mutation: gql`
      mutation releaseAllUnhandledReplies(
        $organizationId: String!
        $ageInHours: Float
        $releaseOnRestricted: Boolean
        $limitToCurrentlyTextableContacts: Boolean
      ) {
        releaseAllUnhandledReplies(
          organizationId: $organizationId
          ageInHours: $ageInHours
          releaseOnRestricted: $releaseOnRestricted
          limitToCurrentlyTextableContacts: $limitToCurrentlyTextableContacts
        ) {
          contactCount
          campaignCount
        }
      }
    `,
    variables: {
      organizationId,
      ageInHours,
      releaseOnRestricted,
      limitToCurrentlyTextableContacts
    }
  })
};

export default compose(
  withRouter,
  withAuthzContext,
  loadData({ mutations })
)(AdminCampaignList);
