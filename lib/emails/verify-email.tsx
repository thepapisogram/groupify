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

interface VerifyEmailProps {
  verifyLink: string;
}

export const VerifyEmail = ({ verifyLink }: VerifyEmailProps) => {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://groupify.anthonysaah.me";

  return (
    <Html>
      <Head />
      <Preview>Confirm your email address to finish setting up Groupify</Preview>
      <Body style={main}>
        <Container style={container}>
          <Section style={logoContainer}>
            <Img src={`${appUrl}/logo.webp`} width="48" height="48" alt="Groupify Logo" style={logo} />
          </Section>
          <Text style={text}>Hello,</Text>
          <Text style={text}>
            Please confirm this email address so you can receive invitations and see forms shared with you on
            Groupify.
          </Text>
          <Section style={buttonContainer}>
            <Button style={button} href={verifyLink}>
              Confirm email address
            </Button>
          </Section>
          <Text style={text}>
            Or copy and paste this URL into your browser:{" "}
            <Link href={verifyLink} style={anchor}>
              {verifyLink}
            </Link>
          </Text>
          <Hr style={hr} />
          <Text style={footer}>
            This link expires in 24 hours. If you didn&apos;t create a Groupify account, you can ignore this email.
          </Text>
        </Container>
      </Body>
    </Html>
  );
};

export default VerifyEmail;

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
