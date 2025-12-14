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

export interface OrderDeliveredProps {
  customerName: string;
  orderNumber: string;
  orderDate: Date;
  deliveredDate: Date;
  productName: string;
  productImage?: string | null;
  shippingAddress?: string[] | null;
  browseUrl: string;
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
    backgroundColor: '#dcfce7',
    border: '1px solid #86efac',
    borderRadius: '10px',
    padding: '16px',
    marginTop: '20px',
    textAlign: 'center' as const,
  },
  ctaButton: {
    backgroundColor: '#16a34a',
    borderRadius: '10px',
    color: '#ffffff',
    display: 'inline-block',
    fontSize: '15px',
    fontWeight: 600,
    padding: '14px 24px',
    textDecoration: 'none',
    marginRight: '8px',
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

export default function OrderDeliveredEmail(props: OrderDeliveredProps) {
  const {
    customerName,
    orderNumber,
    orderDate,
    deliveredDate,
    productName,
    productImage,
    shippingAddress,
    browseUrl,
    supportEmail,
    logoUrl,
  } = props;

  const firstName = customerName?.split(' ')?.[0] || 'there';
  const orderDateDisplay = new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(new Date(orderDate));

  const deliveredDateDisplay = new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date(deliveredDate));

  const previewText = `Your order #${orderNumber} has been delivered!`;

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

          <Text style={styles.heading}>🎉 Your order has been delivered!</Text>
          <Text style={styles.muted}>
            Great news, {firstName}! Your order has been successfully delivered. We hope you enjoy
            your new cards!
          </Text>

          <Section style={styles.highlight}>
            <Text
              style={{
                fontSize: '48px',
                margin: '0',
              }}
            >
              ✅
            </Text>
            <Text style={{ ...styles.heading, margin: '8px 0 4px', fontSize: '18px' }}>
              Package Delivered
            </Text>
            <Text style={{ ...styles.muted, margin: '0' }}>{deliveredDateDisplay}</Text>
          </Section>

          <Section style={styles.card}>
            <Text style={{ ...styles.heading, margin: '0 0 12px' }}>Order details</Text>
            <Text style={styles.muted}>&#35;{orderNumber}</Text>
            <Text style={styles.muted}>Placed on {orderDateDisplay}</Text>
          </Section>

          <Section style={{ ...styles.card, marginTop: '14px' }}>
            <Text style={{ ...styles.heading, margin: '0 0 12px' }}>Item delivered</Text>
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
            <Text style={{ ...styles.heading, margin: '0 0 10px' }}>Delivered to</Text>
            <div style={styles.addressBlock}>{renderAddress(shippingAddress)}</div>
          </Section>

          <Section style={{ textAlign: 'center', marginTop: '24px' }}>
            <Button href={browseUrl} style={styles.ctaButton}>
              Browse more cards
            </Button>
          </Section>

          <Hr style={{ borderColor: '#e5e7eb', margin: '24px 0 16px' }} />

          <Text style={styles.footer}>
            Issue with your order? Email us at{' '}
            <Link href={`mailto:${supportEmail}`}>{supportEmail}</Link> and we&apos;ll help you out.
            <br />
            This email was sent by Kado.io regarding your order delivery.
          </Text>
        </Container>
      </Body>
    </Html>
  );
}
