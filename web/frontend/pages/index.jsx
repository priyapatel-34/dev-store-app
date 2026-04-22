import {
  Page,
  Layout,
  Text,
  Card,
  Stack,
  List,
} from "@shopify/polaris";

export default function HomePage() {
  return (
    <Page title="Retailer Locator App" fullWidth>
      <Layout>

        {/* HERO */}
        <Layout.Section>
          <Card sectioned>
            <Stack vertical spacing="loose">
              <Text as="h1" variant="headingLg">
                Welcome to the Retailer Locator 👋
              </Text>

              <Text as="p" color="subdued">
                Easily manage retailer locations, track store data, and help
                customers find nearby stores directly from your Shopify admin.
              </Text>
            </Stack>
          </Card>
        </Layout.Section>

        {/* FEATURES */}
        <Layout.Section>
          <Card title="What you can do" sectioned>
            <List type="bullet">
              <List.Item>
                Add and manage retailer locations
              </List.Item>
              <List.Item>
              Enable store locator for customers
              </List.Item>
              <List.Item>
              Track active and inactive retailers
              </List.Item>
              <List.Item>
                Add and manage category 
              </List.Item>
              <List.Item>
                Location and Search wise Retailer's Filtering.
              </List.Item>
            </List>
          </Card>
        </Layout.Section>

        {/* GETTING STARTED */}
        <Layout.Section>
          <Card sectioned>
            <Stack vertical spacing="tight">
              <Text as="h3" variant="headingSm">
                Getting started
              </Text>

              <Text as="p" color="subdued">
                Use the navigation on the left to manage retailers, configure
                store data, and start building your store locator experience.
              </Text>
            </Stack>
          </Card>
        </Layout.Section>

      </Layout>
    </Page>
  );
}