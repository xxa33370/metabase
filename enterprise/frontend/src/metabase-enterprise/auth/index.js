import { t } from "ttag";
import { updateIn } from "icepick";
import { LOGIN, LOGIN_GOOGLE } from "metabase/auth/actions";
import { hasPremiumFeature } from "metabase-enterprise/settings";
import MetabaseSettings from "metabase/lib/settings";
import {
  PLUGIN_ADMIN_SETTINGS_UPDATES,
  PLUGIN_AUTH_PROVIDERS,
  PLUGIN_IS_PASSWORD_USER,
  PLUGIN_REDUX_MIDDLEWARES,
} from "metabase/plugins";

import GroupMappingsWidget from "metabase/admin/settings/containers/GroupMappingsWidget";
import SecretKeyWidget from "metabase/admin/settings/components/widgets/SecretKeyWidget";
import SessionTimeoutSetting from "metabase-enterprise/auth/components/SessionTimeoutSetting";

import { createSessionMiddleware } from "../auth/middleware/session-middleware";
import SettingsSAMLForm from "./components/SettingsSAMLForm";
import SettingsJWTForm from "./components/SettingsJWTForm";
import { SsoButton } from "./components/SsoButton";
import JwtAuthCard from "./containers/JwtAuthCard";
import SamlAuthCard from "./containers/SamlAuthCard";

PLUGIN_ADMIN_SETTINGS_UPDATES.push(sections =>
  updateIn(sections, ["authentication", "settings"], settings => [
    ...settings,
    {
      key: "saml-enabled",
      description: null,
      noHeader: true,
      widget: SamlAuthCard,
      getHidden: () => !hasPremiumFeature("sso"),
    },
    {
      key: "jwt-enabled",
      description: null,
      noHeader: true,
      widget: JwtAuthCard,
      getHidden: () => !hasPremiumFeature("sso"),
    },
    {
      key: "enable-password-login",
      display_name: t`Enable Password Authentication`,
      description: t`When enabled, users can additionally log in with email and password.`,
      type: "boolean",
      getHidden: settings =>
        !settings["google-auth-enabled"] &&
        !settings["ldap-enabled"] &&
        !settings["saml-enabled"] &&
        !settings["jwt-enabled"],
    },
    {
      key: "send-new-sso-user-admin-email?",
      display_name: t`Notify admins of new SSO users`,
      description: t`When enabled, administrators will receive an email the first time a user uses Single Sign-On.`,
      type: "boolean",
      getHidden: settings =>
        !settings["google-auth-enabled"] &&
        !settings["ldap-enabled"] &&
        !settings["saml-enabled"] &&
        !settings["jwt-enabled"],
    },
    {
      key: "session-timeout",
      display_name: t`Session timeout`,
      description: t`Time before inactive users are logged out.`,
      widget: SessionTimeoutSetting,
    },
  ]),
);

PLUGIN_ADMIN_SETTINGS_UPDATES.push(sections => ({
  ...sections,
  "authentication/saml": {
    component: SettingsSAMLForm,
    settings: [
      {
        key: "saml-enabled",
        getHidden: () => true,
      },
      {
        key: "saml-identity-provider-uri",
        display_name: t`SAML Identity Provider SSO URL`,
        placeholder: "https://example.com/app/my_saml_app/abc123/sso/saml",
        type: "string",
        required: true,
        autoFocus: true,
      },
      {
        key: "saml-identity-provider-issuer",
        display_name: t`SAML Identity Provider Issuer`,
        placeholder: "http://www.example.com/abc123",
        type: "string",
        required: false,
      },
      {
        key: "saml-identity-provider-certificate",
        display_name: t`SAML Identity Provider Certificate`,
        type: "text",
        required: true,
      },
      {
        key: "saml-application-name",
        display_name: t`SAML Application Name`,
        type: "string",
      },
      {
        key: "saml-keystore-path",
        display_name: t`SAML Keystore Path`,
        type: "string",
      },
      {
        key: "saml-keystore-password",
        display_name: t`SAML Keystore Password`,
        placeholder: "Shh...",
        type: "password",
      },
      {
        key: "saml-keystore-alias",
        display_name: t`SAML Keystore Alias`,
        type: "string",
      },
      {
        key: "saml-attribute-email",
        display_name: t`Email attribute`,
        type: "string",
      },
      {
        key: "saml-attribute-firstname",
        display_name: t`First name attribute`,
        type: "string",
      },
      {
        key: "saml-attribute-lastname",
        display_name: t`Last name attribute`,
        type: "string",
      },
      {
        key: "saml-group-sync",
        display_name: t`Synchronize group memberships`,
        description: null,
        widget: GroupMappingsWidget,
        props: {
          mappingSetting: "saml-group-mappings",
          groupHeading: t`Group Name`,
          groupPlaceholder: "Group Name",
        },
      },
      {
        key: "saml-attribute-group",
        display_name: t`Group attribute name`,
        type: "string",
      },
      {
        key: "saml-group-mappings",
      },
    ],
  },
  "authentication/jwt": {
    component: SettingsJWTForm,
    settings: [
      {
        key: "jwt-enabled",
        display_name: t`JWT Authentication`,
        type: "boolean",
        getHidden: () => true,
      },
      {
        key: "jwt-identity-provider-uri",
        display_name: t`JWT Identity Provider URI`,
        placeholder: "https://jwt.yourdomain.org",
        type: "string",
        required: true,
        autoFocus: true,
        getHidden: settings => !settings["jwt-enabled"],
      },
      {
        key: "jwt-shared-secret",
        display_name: t`String used by the JWT signing key`,
        type: "text",
        required: true,
        widget: SecretKeyWidget,
        getHidden: settings => !settings["jwt-enabled"],
        props: {
          confirmation: {
            header: t`Regenerate JWT signing key?`,
            dialog: t`This will cause existing tokens to stop working until the identity provider is updated with the new key.`,
          },
        },
      },
      {
        key: "jwt-attribute-email",
        display_name: t`Email attribute`,
        type: "string",
      },
      {
        key: "jwt-attribute-firstname",
        display_name: t`First name attribute`,
        type: "string",
      },
      {
        key: "jwt-attribute-lastname",
        display_name: t`Last name attribute`,
        type: "string",
      },
      {
        key: "jwt-group-sync",
        display_name: t`Synchronize group memberships`,
        description: null,
        widget: GroupMappingsWidget,
        props: {
          mappingSetting: "jwt-group-mappings",
          groupHeading: t`Group Name`,
          groupPlaceholder: "Group Name",
        },
      },
      {
        key: "jwt-group-mappings",
      },
    ],
  },
}));

const SSO_PROVIDER = {
  name: "sso",
  Button: SsoButton,
};

PLUGIN_AUTH_PROVIDERS.push(providers => {
  if (MetabaseSettings.get("other-sso-enabled?")) {
    providers = [SSO_PROVIDER, ...providers];
  }
  if (
    !MetabaseSettings.isPasswordLoginEnabled() &&
    !MetabaseSettings.isLdapEnabled()
  ) {
    providers = providers.filter(p => p.name !== "password");
  }
  return providers;
});

PLUGIN_IS_PASSWORD_USER.push(
  user =>
    !user.google_auth &&
    !user.ldap_auth &&
    MetabaseSettings.isPasswordLoginEnabled(),
);

PLUGIN_ADMIN_SETTINGS_UPDATES.push(sections =>
  updateIn(sections, ["authentication/ldap", "settings"], settings => [
    ...settings,
    {
      key: "ldap-group-membership-filter",
      display_name: t`Group membership filter`,
      type: "string",
      validations: [
        value =>
          (value.match(/\(/g) || []).length !==
          (value.match(/\)/g) || []).length
            ? t`Check your parentheses`
            : null,
      ],
    },
    {
      key: "ldap-sync-admin-group",
      display_name: t`Sync Administrator group`,
      type: "boolean",
    },
  ]),
);

PLUGIN_REDUX_MIDDLEWARES.push(createSessionMiddleware([LOGIN, LOGIN_GOOGLE]));
