import { test, expect } from '@grafana/plugin-e2e';

const MAPLIBRE_DASHBOARD = 'floodnet-maplibre.json';
const PANEL_ID = '1';

test('renders the provisioned map panel with legend and playback controls', async ({
  gotoPanelEditPage,
  readProvisionedDashboard,
}) => {
  const dashboard = await readProvisionedDashboard({ fileName: MAPLIBRE_DASHBOARD });
  const panelEditPage = await gotoPanelEditPage({ dashboard, id: PANEL_ID });
  const panel = panelEditPage.panel.locator;

  await expect(panel).toContainText('Precipitation');
  await expect(panel).toContainText('Flood Events');
  await expect(panel.getByRole('slider')).toBeVisible();
});

test('can hide and re-show the legend via panel options', async ({
  gotoPanelEditPage,
  readProvisionedDashboard,
}) => {
  const dashboard = await readProvisionedDashboard({ fileName: MAPLIBRE_DASHBOARD });
  const panelEditPage = await gotoPanelEditPage({ dashboard, id: PANEL_ID });
  const legendOptions = panelEditPage.getCustomOptions('Legend');
  const showLegend = legendOptions.getSwitch('Show legend');
  const panel = panelEditPage.panel.locator;

  await expect(panel).toContainText('Precipitation');

  await showLegend.uncheck({ force: true });
  await expect(panel).not.toContainText('Precipitation');

  await showLegend.check({ force: true });
  await expect(panel).toContainText('Precipitation');
});

test('can hide and re-show playback controls via panel options', async ({
  gotoPanelEditPage,
  readProvisionedDashboard,
}) => {
  const dashboard = await readProvisionedDashboard({ fileName: MAPLIBRE_DASHBOARD });
  const panelEditPage = await gotoPanelEditPage({ dashboard, id: PANEL_ID });
  const playbackOptions = panelEditPage.getCustomOptions('Time playback');
  const showPlayback = playbackOptions.getSwitch('Show time playback controls');
  const slider = panelEditPage.panel.locator.getByRole('slider');

  await expect(slider).toBeVisible();

  await showPlayback.uncheck({ force: true });
  await expect(slider).toBeHidden();

  await showPlayback.check({ force: true });
  await expect(slider).toBeVisible();
});
