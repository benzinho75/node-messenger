import { useContext, useEffect } from "react";
import { useCookies } from "react-cookie";
import crypto, { randomBytes } from "crypto";
import qs from "qs";
import axios from "axios";
/** @jsx jsx */
import { jsx } from "@emotion/core";
// Layout
import { useTheme, withStyles } from "@material-ui/core/styles";
import Link from "@material-ui/core/Link";
// Local
import Context from "./Context";
import { useHistory } from "react-router-dom";
import Button from "@material-ui/core/Button";
import { orange, purple } from "@material-ui/core/colors";
import Grid from "@material-ui/core/Grid";
import { enUS } from "@material-ui/core/locale";

const ColorButton = withStyles((theme) => ({
  root: {
    color: "white",
    backgroundColor: orange[500],
    "&:hover": {
      backgroundColor: orange[700],
    },
  },
}))(Button);

const base64URLEncode = (str) => {
  return str
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=/g, "");
};

const sha256 = (buffer) => {
  return crypto.createHash("sha256").update(buffer).digest();
};

const useStyles = (theme) => ({
  root: {
    flex: "0 1 auto",
    background: theme.palette.background.default,
    display: "flex",
    direction: "column",
    justifyContent: "flex-start",
    alignItems: "center",
    marginTop: "5vh",
    "& fieldset": {
      border: "none",
      "& label": {
        marginBottom: theme.spacing(0.5),
        display: "block",
      },
    },
  },
  title: {
    background:
      "linear-gradient(15deg, rgb(255, 255, 230) -20%, rgb(255, 157, 69) 45%, rgb(255, 157, 69) 50%, rgb(244, 52, 17) 120%)",
    "-webkit-background-clip": "text",
    "-webkit-text-fill-color": "transparent",
    textAlign: "center",
    fontSize: "150%",
    lineHeight: "125%",
  },
  margin: {
    margin: theme.spacing(1),
  },
});

const Redirect = ({ config, codeVerifier }) => {
  const styles = useStyles(useTheme());
  const redirect = (e) => {
    e.stopPropagation();
    const code_challenge = base64URLEncode(sha256(codeVerifier));
    const url = [
      `${config.authorization_endpoint}?`,
      `client_id=${config.client_id}&`,
      `scope=${config.scope}&`,
      `response_type=code&`,
      `redirect_uri=${config.redirect_uri}&`,
      `code_challenge=${code_challenge}&`,
      `code_challenge_method=S256`,
    ].join("");
    window.location = url;
  };
  return (
    <div css={styles.root}>
      <Grid
        container
        direction="column"
        justify="center"
        alignItems="center"
        spacing={5}
      >
        <Grid container item xs={10} justify="center">
          <h1 css={styles.title}>
            Hang out, anytime, anywhere.<br></br>
            FireChat is a simple messenger app built with JavaScript, Node.js
            and React.<br></br>
            It makes it easy and fun to stay close to your favorite people.
          </h1>
        </Grid>
        <Grid container item justify="center">
          <ColorButton
            onClick={redirect}
            variant="contained"
            color="primary"
            className={styles.margin}
          >
            Login with OpenID Connect
          </ColorButton>
        </Grid>
      </Grid>
    </div>
  );
};

const Tokens = ({ oauth }) => {
  const { setOauth } = useContext(Context);
  const styles = useStyles(useTheme());
  const { id_token } = oauth;
  const id_payload = id_token.split(".")[1];
  const { email } = JSON.parse(atob(id_payload));
  const logout = (e) => {
    e.stopPropagation();
    setOauth(null);
  };
  return (
    <div css={styles.root}>
      Welcome {email}{" "}
      <Link onClick={logout} color="secondary">
        logout
      </Link>
    </div>
  );
};

export default ({ onUser }) => {
  const styles = useStyles(useTheme());
  const history = useHistory();
  // const location = useLocation();
  const [cookies, setCookie, removeCookie] = useCookies([]);
  const { oauth, setOauth } = useContext(Context);
  const config = {
    authorization_endpoint: "http://127.0.0.1:5556/dex/auth",
    token_endpoint: "http://127.0.0.1:5556/dex/token",
    client_id: "webtech-frontend",
    redirect_uri: "http://127.0.0.1:3000",
    scope: "openid%20email%20offline_access",
  };
  const params = new URLSearchParams(window.location.search);
  const code = params.get("code");
  // is there a code query parameters in the url
  if (!code) {
    // no: we are not being redirected from an oauth server
    if (!oauth) {
      const codeVerifier = base64URLEncode(crypto.randomBytes(32));
      setCookie("code_verifier", codeVerifier);
      return (
        <Redirect
          codeVerifier={codeVerifier}
          config={config}
          css={styles.root}
        />
      );
    } else {
      // yes: user is already logged in, great, is is working
      return <Tokens oauth={oauth} css={styles.root} />;
    }
  } else {
    // yes: we are coming from an oauth server
    const codeVerifier = cookies.code_verifier;
    useEffect(() => {
      const fetch = async () => {
        try {
          const { data: fetchOauth } = await axios.post(
            config.token_endpoint,
            qs.stringify({
              grant_type: "authorization_code",
              client_id: `${config.client_id}`,
              code_verifier: `${codeVerifier}`,
              redirect_uri: `${config.redirect_uri}`,
              code: `${code}`,
            })
          );
          removeCookie("code_verifier");
          setOauth(fetchOauth);

          try {
            // Add user to db if it doesn't exist yet
            const { data: users } = await axios.get(
              `http://localhost:3001/users`,
              {
                headers: {
                  Authorization: `Bearer ${fetchOauth.access_token}`
                },
              }
            );

            if (
              users.some((item) => item.email === fetchOauth.email) === true
            ) {
              console.log("User already in DB");
            } else {
              const { data: random } = await axios.get(`https://randomuser.me/api/?inc=login&noinfo`);
              console.log(random);
              console.log(random.results[0].login.username);
              await axios.post(`http://localhost:3001/users`, {
                email: fetchOauth.email,
                username: random.results[0].login.username,
                avatarChoice: 1,
                avatarSelected: 6,
                locale: "enUS",
                darktheme: true,
              },
              {
                headers: {
                  'Authorization': `Bearer ${fetchOauth.access_token}`
                }
              });
            }
          } catch (err) {
            console.error(
              "Error in checking if user is in DB / adding it" + err
            );
          }

          //window.location = '/'
          history.push("/");
        } catch (err) {
          console.error("Error in oauth fetching" + err);
        }
      };
      fetch();
    });
    return <div css={styles.root}>Loading tokens</div>;
  }
};
