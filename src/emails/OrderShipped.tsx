import * as React from 'react';
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
} from '@react-email/components';

export interface OrderShippedProps {
  customerName: string;
  orderNumber: string;
  orderDate: Date;
  productName: string;
  productImage?: string | null;
  shippingCarrier: string;
  trackingNumber: string;
  trackingUrl: string;
  estimatedDelivery?: string | null;
  shippingAddress?: string[] | null;
  ctaUrl: string;
  supportEmail: string;
  logoUrl: string;
}

const styles = {
  body: {
    backgroundColor: '#f5f5f5',
    color: '#111827',
    fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif',
    margin: 0,
    padding: '24px 0',
  },
  container: {
    backgroundColor: '#ffffff',
    borderRadius: '12px',
    boxShadow: '0 6px 24px rgba(0,0,0,0.06)',
    margin: '0 auto',
    maxWidth: '640px',
    padding: '32px 28px',
  },
  logo: {
    height: '32px',
    marginBottom: '16px',
  },
  heading: {
    fontSize: '20px',
    fontWeight: '700',
    margin: '0 0 8px',
  },
  muted: {
    color: '#4b5563',
    fontSize: '14px',
    margin: '0',
    lineHeight: '20px',
  },
  card: {
    border: '1px solid #e5e7eb',
    borderRadius: '10px',
    padding: '16px',
    marginTop: '20px',
    backgroundColor: '#fafafa',
  },
  highlight: {
    backgroundColor: '#dbeafe',
    border: '1px solid #93c5fd',
    borderRadius: '10px',
    padding: '16px',
    marginTop: '20px',
  },
  trackingNumber: {
    fontSize: '18px',
    fontWeight: '700',
    fontFamily: 'monospace',
    color: '#111827',
    margin: '8px 0',
  },
  ctaButton: {
    backgroundColor: '#2563eb',
    borderRadius: '10px',
    color: '#ffffff',
    display: 'inline-block',
    fontSize: '15px',
    fontWeight: 600,
    padding: '14px 24px',
    textDecoration: 'none',
  },
  secondaryButton: {
    backgroundColor: '#f3f4f6',
    borderRadius: '10px',
    color: '#111827',
    display: 'inline-block',
    fontSize: '15px',
    fontWeight: 600,
    padding: '14px 24px',
    textDecoration: 'none',
    border: '1px solid #d1d5db',
  },
  footer: {
    fontSize: '12px',
    color: '#6b7280',
    marginTop: '24px',
    lineHeight: '18px',
  },
  addressBlock: {
    border: '1px solid #e5e7eb',
    borderRadius: '8px',
    padding: '12px',
    backgroundColor: '#ffffff',
  },
};

export default function OrderShippedEmail(props: OrderShippedProps) {
  const {
    customerName,
    orderNumber,
    orderDate,
    productName,
    productImage,
    shippingCarrier,
    trackingNumber,
    trackingUrl,
    estimatedDelivery,
    shippingAddress,
    ctaUrl,
    supportEmail,
    logoUrl,
  } = props;

  const firstName = customerName?.split(' ')?.[0] || 'there';
  const orderDateDisplay = new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(new Date(orderDate));

  const previewText = `Your order #${orderNumber} has shipped!`;

  const renderAddress = (lines?: string[] | null) => {
    if (!lines || lines.length === 0) {
      return <Text style={styles.muted}>No address provided</Text>;
    }

    return (
      <div>
        {lines.map((line, idx) => (
          <Text key={idx} style={{ ...styles.muted, margin: '0' }}>
            {line}
          </Text>
        ))}
      </div>
    );
  };

  return (
    <Html>
      <Head />
      <Preview>{previewText}</Preview>
      <Body style={styles.body}>
        <Container style={styles.container}>
          <Img src={logoUrl} alt="Kado.io" style={styles.logo} />

          <Text style={styles.heading}>📦 Your order has shipped, {firstName}!</Text>
          <Text style={styles.muted}>
            Good news! Your order has been shipped and is on its way to you. Track your package
            using the information below.
          </Text>

          <Section style={styles.highlight}>
            <Text style={{ ...styles.heading, margin: '0 0 8px', fontSize: '16px' }}>
              Tracking Information
            </Text>
            <Text style={{ ...styles.muted, margin: '0 0 4px' }}>Carrier: {shippingCarrier}</Text>
            <Text style={styles.trackingNumber}>{trackingNumber}</Text>
            {estimatedDelivery && (
              <Text style={styles.muted}>Estimated delivery: {estimatedDelivery}</Text>
            )}
          </Section>

          <Section style={{ textAlign: 'center', marginTop: '20px' }}>
            <Button href={trackingUrl} style={styles.ctaButton}>
              Track your package
            </Button>
          </Section>

          <Section style={styles.card}>
            <Text style={{ ...styles.heading, margin: '0 0 12px' }}>Order details</Text>
            <Text style={styles.muted}>&#35;{orderNumber}</Text>
            <Text style={styles.muted}>Placed on {orderDateDisplay}</Text>
          </Section>

          <Section style={{ ...styles.card, marginTop: '14px' }}>
            <Text style={{ ...styles.heading, margin: '0 0 12px' }}>Item shipped</Text>
            {productImage && (
              <Img
                src={productImage}
                alt={productName}
                width={120}
                height={120}
                style={{
                  borderRadius: '12px',
                  objectFit: 'contain',
                  backgroundColor: '#f3f4f6',
                  border: '1px solid #e5e7eb',
                  padding: '8px',
                  marginBottom: '12px',
                }}
              />
            )}
            <Text style={{ fontSize: '15px', fontWeight: 600, margin: '0' }}>{productName}</Text>
          </Section>

          <Section style={{ ...styles.card, marginTop: '14px' }}>
            <Text style={{ ...styles.heading, margin: '0 0 10px' }}>Shipping address</Text>
            <div style={styles.addressBlock}>{renderAddress(shippingAddress)}</div>
          </Section>

          <Section style={{ textAlign: 'center', marginTop: '20px' }}>
            <Button href={ctaUrl} style={styles.secondaryButton}>
              View order details
            </Button>
          </Section>

          <Hr style={{ borderColor: '#e5e7eb', margin: '24px 0 16px' }} />

          <Text style={styles.footer}>
            Need help? Email us at <Link href={`mailto:${supportEmail}`}>{supportEmail}</Link>.
            <br />
            This email was sent by Kado.io regarding your order shipment.
          </Text>
        </Container>
      </Body>
    </Html>
  );
}
