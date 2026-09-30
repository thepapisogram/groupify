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

interface ResetPasswordEmailProps {
  resetLink: string;
}

export const ResetPasswordEmail = ({ resetLink }: ResetPasswordEmailProps) => {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://groupify.anthonysaah.me";

  return (
    <Html>
      <Head />
      <Preview>Reset your Groupify password</Preview>
      <Body style={main}>
        <Container style={container}>
          <Section style={logoContainer}>
            <Img src={`${appUrl}/logo.webp`} width="48" height="48" alt="Groupify Logo" style={logo} />
          </Section>
          <Text style={text}>Hello,</Text>
          <Text style={text}>Someone asked to reset the password for your Groupify account. Choose a new one here:</Text>
          <Section style={buttonContainer}>
            <Button style={button} href={resetLink}>
              Reset password
            </Button>
          </Section>
          <Text style={text}>
            Or copy and paste this URL into your browser:{" "}
            <Link href={resetLink} style={anchor}>
              {resetLink}
            </Link>
          </Text>
          <Hr style={hr} />
          <Text style={footer}>
            This link expires in 1 hour and works once. If you didn&apos;t ask for this, you can ignore this email and
            your password will stay the same.
          </Text>
        </Container>
      </Body>
    </Html>
  );
};

export default ResetPasswordEmail;

const main = {
  backgroundColor: "#080a0f",
  fontFamily: '-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,"Helvetica Neue",Ubuntu,sans-serif',
};
const container = {
  backgroundColor: "#0e121a",
  margin: "0 auto",
  padding: "20px 0 48px",
  marginBottom: "64px",
  borderRadius: "16px",
  border: "1px solid #1e293b",
};
const logoContainer = { padding: "20px 0", textAlign: "center" as const };
const logo = { margin: "0 auto", borderRadius: "12px" };
const text = { color: "#f8fafc", fontSize: "16px", lineHeight: "24px", padding: "0 40px" };
const buttonContainer = { padding: "20px 40px", textAlign: "center" as const };
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
const anchor = { color: "#38bdf8" };
const hr = { borderColor: "#1e293b", margin: "20px 0" };
const footer = { color: "#94a3b8", fontSize: "14px", padding: "0 40px" };
