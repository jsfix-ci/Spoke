import Button from "@material-ui/core/Button";
import Dialog from "@material-ui/core/Dialog";
import DialogActions from "@material-ui/core/DialogActions";
import DialogContent from "@material-ui/core/DialogContent";
import DialogContentText from "@material-ui/core/DialogContentText";
import { css, StyleSheet } from "aphrodite";
import { Card, CardHeader, CardText } from "material-ui/Card";
import { Tab, Tabs } from "material-ui/Tabs";
import type from "prop-types";
import React, { Component } from "react";
import Select, { createFilter } from "react-select";

import theme from "../../../styles/theme";

const styles = StyleSheet.create({
  container: {
    ...theme.layouts.multiColumn.container,
    alignContent: "flex-start",
    justifyContent: "flex-start",
    flexWrap: "wrap",
    alignItems: "center"
  },
  flexColumn: {
    flex: 0,
    flexBasis: "30%",
    display: "flex"
  },
  spacer: {
    marginRight: "30px"
  }
});

const formatTexter = (texter) => {
  const { displayName, email, role } = texter;
  return `${displayName} (${email}) ${role}`;
};

const MenuList = (props) => {
  const { children } = props;

  if (!children.length) {
    return <div>{children}</div>;
  }

  return (
    <div>
      {children.length &&
        children.slice(0, 5).map((key) => {
          delete key.props.innerProps.onMouseMove; // FIX LAG!!
          delete key.props.innerProps.onMouseOver; // FIX LAG!!

          return <div key={key}>{key}</div>;
        })}
    </div>
  );
};

class IncomingMessageActions extends Component {
  state = {
    selectedTexters: [],
    confirmDialogOpen: false
  };

  onReassignmentClicked = () => {
    const { selectedTexters } = this.state;
    const texterIds = selectedTexters.map((texter) => texter.value);
    this.props.onReassignRequested(texterIds);
  };

  onUnassignClicked = () => {
    this.props.onUnassignRequested();
  };

  onReassignAllMatchingClicked = () => {
    this.setState({ confirmDialogOpen: "reassign" });
  };

  onUnassignAllMatchingClicked = () => {
    this.setState({ confirmDialogOpen: "unassign" });
  };

  handleTextersChanged = (selectedTexters) => {
    this.setState({ selectedTexters });
  };

  handleConfirmDialogCancel = () => {
    this.setState({ confirmDialogOpen: false });
  };

  handleConfirmDialogReassign = () => {
    this.setState({ confirmDialogOpen: false });
    const { selectedTexters } = this.state;
    const texterIds = selectedTexters.map((texter) => texter.value);
    this.props.onReassignAllMatchingRequested(texterIds);
  };

  handleConfirmDialogUnassign = () => {
    this.setState({ confirmDialogOpen: false });
    this.props.onUnassignAllMatchingRequested();
  };

  render() {
    let texters = this.props.people || [];
    texters = texters.map((texter) => ({
      value: texter.id,
      label: formatTexter(texter)
    }));

    const confirmDialogActions = (actionVerb, confirmAction) => [
      <Button
        key="cancel"
        color="primary"
        onClick={this.handleConfirmDialogCancel}
      >
        Cancel
      </Button>,
      <Button key="verb" color="primary" onClick={confirmAction}>
        {actionVerb || "Reassign"}
      </Button>
    ];

    const { contactsAreSelected, conversationCount } = this.props;
    const { selectedTexters } = this.state;
    const hasSelectedTexters = selectedTexters.length > 0;
    return (
      <Card>
        <CardHeader
          title=" Message Actions "
          actAsExpander
          showExpandableButton
        />
        <CardText expandable>
          <Tabs>
            <Tab label="Reassign">
              <div>
                <p>
                  <Select
                    components={{ MenuList }}
                    onChange={this.handleTextersChanged}
                    filterOption={createFilter({ ignoreAccents: false })}
                    options={texters}
                    isMulti
                    placeholder="Select at least one texter"
                  />
                </p>
              </div>

              <div className={css(styles.container)}>
                <div className={css(styles.flexColumn)}>
                  <Button
                    onClick={this.onReassignmentClicked}
                    disabled={!contactsAreSelected || !hasSelectedTexters}
                  >
                    Reassign selected
                  </Button>
                </div>
                <div className={css(styles.flexColumn)}>
                  <Button
                    onClick={this.onReassignAllMatchingClicked}
                    disabled={conversationCount === 0 || !hasSelectedTexters}
                  >{`Reassign all ${conversationCount} matching`}</Button>
                </div>
                <Dialog
                  open={this.state.confirmDialogOpen === "reassign"}
                  disableEscapeKeyDown
                  disableBackdropClick
                  onClose={this.handleConfirmDialogCancel}
                >
                  <DialogContent>
                    <DialogContentText>
                      {`Reassign all ${conversationCount} matching conversations?`}
                    </DialogContentText>
                  </DialogContent>
                  <DialogActions>
                    {confirmDialogActions(
                      "Reassign",
                      this.handleConfirmDialogReassign
                    )}
                  </DialogActions>
                </Dialog>
              </div>
            </Tab>
            <Tab label="Unassign">
              <div className={css(styles.container)}>
                <div className={css(styles.flexColumn)}>
                  <Button
                    onClick={this.onUnassignClicked}
                    disabled={!contactsAreSelected}
                  >
                    Unassign selected
                  </Button>
                </div>
                <div className={css(styles.flexColumn)}>
                  <Button
                    onClick={this.onUnassignAllMatchingClicked}
                    disabled={conversationCount === 0}
                  >{`Unassign all ${conversationCount} matching`}</Button>
                </div>
                <Dialog
                  open={this.state.confirmDialogOpen === "unassign"}
                  disableBackdropClick
                  disableEscapeKeyDown
                  onClose={this.handleConfirmDialogCancel}
                >
                  <DialogContent>
                    <DialogContentText>
                      {`Unassign all ${conversationCount} matching conversations?`}
                    </DialogContentText>
                  </DialogContent>
                  <DialogActions>
                    {confirmDialogActions(
                      "Unassign",
                      this.handleConfirmDialogUnassign
                    )}
                  </DialogActions>
                </Dialog>
              </div>
            </Tab>
          </Tabs>

          {/* <br/>
          <div>
            <Button
              color="primary"
              onClick={this.props.markForSecondPass}
              disabled={!this.props.contactsAreSelected}
            >
              Reset Message Status
            </Button>
          </div> */}
        </CardText>
      </Card>
    );
  }
}

IncomingMessageActions.propTypes = {
  people: type.array,
  onReassignRequested: type.func.isRequired,
  onReassignAllMatchingRequested: type.func.isRequired,
  conversationCount: type.number
};

export default IncomingMessageActions;