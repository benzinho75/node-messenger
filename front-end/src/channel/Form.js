import { useState, useContext } from "react";
import Context from "../Context";
import axios from "axios";
/** @jsx jsx */
import { jsx } from "@emotion/core";
// Layout
import Button from "@material-ui/core/Button";
// import Icon from "@material-ui/core/Icon"
import SendIcon from "@material-ui/icons/Send";
import TextField from "@material-ui/core/TextField";
import { useTheme, withStyles } from "@material-ui/core/styles";
import { orange } from "@material-ui/core/colors";

const useStyles = (theme) => {
  // See https://github.com/mui-org/material-ui/blob/next/packages/material-ui/src/OutlinedInput/OutlinedInput.js
  const borderColor =
    theme.palette.mode === "light"
      ? "rgba(0, 0, 0, 0.23)"
      : "rgba(255, 255, 255, 0.23)";
  return {
    form: {
      borderTop: `2px solid ${borderColor}`,
      padding: ".5rem",
      display: "flex",
    },
    content: {
      flex: "1 1 auto",
      "&.MuiTextField-root": {
        marginRight: theme.spacing(1),
      },
    },
    sendContainer: {
      display: "flex",
      flexDirection: "column",
    },
    send: {
      flex: "1 1 auto",
    },
  };
};

const ColorTextField = withStyles((theme) => ({
  root: {
    "& label.Mui-focused": {
      color: orange[500],
    },
    "& .MuiInput-underline:after": {
      borderBottomColor: orange[500],
    },
    "& .MuiOutlinedInput-root": {
      "&.Mui-focused fieldset": {
        borderColor: orange[500],
      },
    },
  },
}))(TextField);



export default ({ addMessage, channel }) => {
  const styles = useStyles(useTheme());

  const { oauth } = useContext(Context);

  const [content, setContent] = useState("");

  const onSubmit = async () => {
    const { data: message } = await axios.post(
      `http://localhost:3001/channels/${channel.id}/messages`,
      {
        content: content,
        author: oauth.email,
      },
      {
        headers: {
          Authorization: `Bearer ${oauth.access_token}`,
          email: oauth.email,
        },
      }
    );
    addMessage(message);
    setContent("");
  };
  const handleChange = (e) => {
    setContent(e.target.value);
  };
  return (
    <form
      css={styles.form}
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit();
      }}
    >
      <ColorTextField
        autoFocus
        id="outlined-multiline-flexible"
        label="Message"
        /* multiline */
        rowsMax={4}
        value={content}
        onChange={handleChange}
        variant="outlined"
        css={styles.content}
        required
      />
      <div css={styles.sendContainer}>
        <Button
          type="submit"
          variant="contained"
          color="primary"
          css={styles.send}
          endIcon={<SendIcon />}
        >
          Send
        </Button>
      </div>
    </form>
  );
};
