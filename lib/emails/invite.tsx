import {
  Body,
  Button,
  Container,
  Head,
  Hr,
  Html,
  Img,
  Link,
  Preview,
  Section,
  Text,
} from "@react-email/components";
import * as React from "react";

interface InviteEmailProps {
  invitedBy: string;
  formTitle: string;
  inviteLink: string;
  declineLink: string;
}

export const InviteEmail = ({
  invitedBy,
  formTitle,
  inviteLink,
  declineLink,
}: InviteEmailProps) => {
  const previewText = `You have been invited to collaborate on ${formTitle}`;
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://groupify.vercel.app";

  return (
    <Html>
      <Head />
      <Preview>{previewText}</Preview>
      <Body style={main}>
        <Container style={container}>
          <Section style={logoContainer}>
            <Img
              src={`${appUrl}/logo.webp`}
              width="48"
              height="48"
              alt="Groupify Logo"
              style={logo}
            />
          </Section>
          <Text style={text}>Hello,</Text>
          <Text style={text}>
            <strong>{invitedBy}</strong> has invited you to collaborate on their form:{" "}
            <strong>{formTitle}</strong>
          </Text>
          <Section style={buttonContainer}>
            <Button style={button} href={inviteLink}>
              Accept Invitation
            </Button>
          </Section>
          <Text style={text}>
            Or copy and paste this URL into your browser:{" "}
            <Link href={inviteLink} style={anchor}>
              {inviteLink}
            </Link>
          </Text>
          <Hr style={hr} />
          <Text style={footer}>
            This invitation will expire in 7 days. If you don&apos;t want to collaborate, you can{" "}
            <Link href={declineLink} style={anchor}>
              decline this invitation
            </Link>.
          </Text>
        </Container>
      </Body>
    </Html>
  );
};

export default InviteEmail;

const main = {
  backgroundColor: "#080a0f",
  fontFamily:
    '-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,"Helvetica Neue",Ubuntu,sans-serif',
};

const container = {
  backgroundColor: "#0e121a",
  margin: "0 auto",
  padding: "20px 0 48px",
  marginBottom: "64px",
  borderRadius: "16px",
  border: "1px solid #1e293b",
  boxShadow: "0 4px 24px -1px rgba(0, 0, 0, 0.5)",
};

const logoContainer = {
  padding: "20px 0",
  textAlign: "center" as const,
};

const logo = {
  margin: "0 auto",
  borderRadius: "12px",
};

const text = {
  color: "#f8fafc",
  fontSize: "16px",
  lineHeight: "24px",
  padding: "0 40px",
};

const buttonContainer = {
  padding: "20px 40px",
  textAlign: "center" as const,
};

const button = {
  backgroundColor: "#1cbac8",
  borderRadius: "12px",
  color: "#080a0f",
  fontSize: "16px",
  fontWeight: "bold",
  textDecoration: "none",
  textAlign: "center" as const,
  display: "block",
  width: "100%",
  padding: "12px",
};

const anchor = {
  color: "#38bdf8",
};

const hr = {
  borderColor: "#1e293b",
  margin: "20px 0",
};

const footer = {
  color: "#94a3b8",
  fontSize: "14px",
  padding: "0 40px",
};
