import { 
  Button, 
  Html, 
  Text, 
  Container, 
  Section, 
  Heading, 
  Hr,
  Preview,
  Body
} from '@react-email/components';
import * as React from 'react';

interface AuthRequestEmailProps {
  machineName: string;
  description: string;
  approveUrl: string;
  denyUrl: string;
}

export const AuthRequestEmail = ({ 
  machineName, 
  description,
  approveUrl, 
  denyUrl 
}: AuthRequestEmailProps) => (
  <Html>
    <Preview>Solicitud de Autorización: {machineName}</Preview>
    <Body style={main}>
      <Container style={container}>
        <Heading style={heading}>Autorización de Mantenimiento</Heading>
        <Text style={paragraph}>
          Se ha solicitado un nuevo registro de mantenimiento para: <strong>{machineName}</strong>
        </Text>
        <Section style={descriptionContainer}>
          <Text style={descriptionHeading}>Descripción del Servicio:</Text>
          <Text style={descriptionText}>{description}</Text>
        </Section>
        <Section style={btnContainer}>
          <Button href={approveUrl} style={approveBtn}>
            Autorizar Registro
          </Button>
          <Button href={denyUrl} style={denyBtn}>
            Denegar
          </Button>
        </Section>
        <Hr style={hr} />
        <Text style={footer}>
          SIGMA - Sistema de Control de Bitácoras
        </Text>
      </Container>
    </Body>
  </Html>
);

export default AuthRequestEmail;

const main = {
  backgroundColor: '#f6f9fc',
  fontFamily: '-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,"Helvetica Neue",Ubuntu,sans-serif',
};

const container = {
  backgroundColor: '#ffffff',
  margin: '0 auto',
  padding: '20px 0 48px',
  marginBottom: '64px',
};

const heading = {
  fontSize: '24px',
  letterSpacing: '-0.5px',
  lineHeight: '1.3',
  fontWeight: '400',
  color: '#484848',
  padding: '0 48px',
};

const paragraph = {
  fontSize: '16px',
  lineHeight: '26px',
  color: '#484848',
  padding: '0 48px',
};

const descriptionContainer = {
  margin: '20px 48px',
  padding: '16px',
  backgroundColor: '#f9f9f9',
  borderRadius: '8px',
  border: '1px solid #eeeeee',
};

const descriptionHeading = {
  fontSize: '12px',
  fontWeight: 'bold',
  textTransform: 'uppercase' as const,
  color: '#888888',
  marginBottom: '4px',
  marginTop: '0',
};

const descriptionText = {
  fontSize: '14px',
  lineHeight: '20px',
  color: '#333333',
  margin: '0',
};

const btnContainer = {
  padding: '20px 48px',
};

const approveBtn = {
  backgroundColor: '#000',
  borderRadius: '5px',
  color: '#fff',
  fontSize: '16px',
  fontWeight: 'bold',
  textDecoration: 'none',
  textAlign: 'center' as const,
  display: 'inline-block',
  padding: '12px 24px',
};

const denyBtn = {
  color: '#ff0000',
  fontSize: '16px',
  fontWeight: 'bold',
  textDecoration: 'none',
  textAlign: 'center' as const,
  display: 'inline-block',
  marginLeft: '20px',
  padding: '12px 24px',
  border: '1px solid #ff0000',
  borderRadius: '5px',
};

const hr = {
  borderColor: '#e6ebf1',
  margin: '20px 0',
};

const footer = {
  color: '#8898aa',
  fontSize: '12px',
  lineHeight: '16px',
  padding: '0 48px',
};
