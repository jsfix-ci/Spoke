import React from "react";
import PropTypes from "prop-types";
import pick from "lodash/pick";
import GSFormField from "./GSFormField";
import { allScriptFields } from "../../lib/scripts";
import ScriptEditor from "../ScriptEditor";
import Dialog from "material-ui/Dialog";
import FlatButton from "material-ui/FlatButton";
import RaisedButton from "material-ui/RaisedButton";
import TextField from "material-ui/TextField";
import { dataTest } from "../../lib/attributes";

const styles = {
  dialog: {
    zIndex: 10001
  }
};

class GSScriptField extends GSFormField {
  constructor(props) {
    super(props);
    this.state = {
      open: false,
      script: props.value
    };
  }

  handleOpenDialog = event => {
    event.stopPropagation();
    event.preventDefault();
    this.setState(
      {
        open: true
      },
      () => this.refs.dialogScriptInput.focus()
    );
  };

  handleCancelDialog = () => {
    // Reset any changes the user has made in the Editor
    const script = this.props.value;
    this.setState({
      open: false,
      script
    });
  };

  handleSaveScript = () => {
    const value = this.state.script;
    this.props.onChange(value);
    this.setState({ open: false });
  };

  renderDialog() {
    const { open } = this.state;
    const { customFields, sampleContact } = this.props;
    const scriptFields = allScriptFields(customFields);

    return (
      <Dialog
        style={styles.dialog}
        actions={[
          <FlatButton
            {...dataTest("scriptCancel")}
            label="Cancel"
            onTouchTap={this.handleCancelDialog}
          />,
          <RaisedButton
            {...dataTest("scriptDone")}
            label="Done"
            onTouchTap={this.handleSaveScript}
            primary
          />
        ]}
        modal
        open={open}
        onRequestClose={this.handleCancelDialog}
      >
        <ScriptEditor
          expandable
          ref="dialogScriptInput"
          scriptText={this.state.script}
          sampleContact={sampleContact}
          scriptFields={scriptFields}
          onChange={val => this.setState({ script: val })}
        />
      </Dialog>
    );
  }

  render() {
    // The "errors" prop is an empty object and is not mentioned in yum or react-formal documentation
    const passThroughProps = pick(this.props, [
      "className",
      "fullWidth",
      "hintText",
      "label",
      "multiLine",
      "name",
      "value",
      "onBlur",
      "onChange"
    ]);

    return (
      <div>
        <TextField
          multiLine
          onClick={this.handleOpenDialog}
          floatingLabelText={this.floatingLabelText()}
          floatingLabelStyle={{
            zIndex: 0
          }}
          {...passThroughProps}
        />
        {this.renderDialog()}
      </div>
    );
  }
}

GSScriptField.propTypes = {
  value: PropTypes.string.isRequired,
  onChange: PropTypes.func.isRequired
};

export default GSScriptField;
