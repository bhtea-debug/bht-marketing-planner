import { db } from './index';
import {
  channels,
  campaigns,
  tasks,
  budget_entries,
  kpi_entries,
} from './schema';

async function seed() {
  try {
    console.log('Starting database seed...');

    // Insert channels
    console.log('Inserting channels...');
    const insertedChannels = await db
      .insert(channels)
      .values([
        { name: 'Instagram', color: '#E4405F', icon: 'instagram' },
        { name: 'Facebook', color: '#1877F2', icon: 'facebook' },
        { name: 'TikTok', color: '#000000', icon: 'tiktok' },
        { name: 'Pinterest', color: '#E60023', icon: 'pinterest' },
        { name: 'Email', color: '#EA4335', icon: 'mail' },
        { name: 'SEO', color: '#4285F4', icon: 'search' },
        { name: 'Google Ads', color: '#4285F4', icon: 'ads' },
      ])
      .returning();

    const channelMap = Object.fromEntries(
      insertedChannels.map((ch) => [ch.name, ch.id])
    );

    console.log('Inserted channels:', channelMap);

    // Insert campaigns for Brown House & Tea
    console.log('Inserting campaigns...');
    const insertedCampaigns = await db
      .insert(campaigns)
      .values([
        {
          name: 'Spring Collection Launch',
          description: 'Launch new spring tea collection across all channels',
          channel_id: channelMap['Instagram'],
          status: 'active',
          start_date: '2026-04-01',
          end_date: '2026-05-31',
          budget_planned: 5000,
          budget_spent: 2500,
        },
        {
          name: 'Mother\'s Day Special',
          description: 'Mother\'s Day gift sets and special packaging',
          channel_id: channelMap['Facebook'],
          status: 'active',
          start_date: '2026-04-15',
          end_date: '2026-05-15',
          budget_planned: 3000,
          budget_spent: 1200,
        },
        {
          name: 'Email Newsletter Series',
          description: 'Monthly newsletter with tea recipes and stories',
          channel_id: channelMap['Email'],
          status: 'active',
          start_date: '2026-01-01',
          end_date: '2026-12-31',
          budget_planned: 1500,
          budget_spent: 300,
        },
        {
          name: 'TikTok Content Strategy',
          description: 'Short-form video content showcasing tea preparation',
          channel_id: channelMap['TikTok'],
          status: 'planning',
          start_date: '2026-05-01',
          end_date: '2026-08-31',
          budget_planned: 4000,
          budget_spent: 0,
        },
        {
          name: 'Pinterest Board Development',
          description: 'Curated boards for tea recipes, home decor, wellness',
          channel_id: channelMap['Pinterest'],
          status: 'active',
          start_date: '2026-03-01',
          end_date: '2026-12-31',
          budget_planned: 2000,
          budget_spent: 500,
        },
        {
          name: 'SEO Blog Series',
          description: 'Long-form blog content for organic search',
          channel_id: channelMap['SEO'],
          status: 'active',
          start_date: '2026-02-01',
          end_date: '2026-12-31',
          budget_planned: 3500,
          budget_spent: 1800,
        },
      ])
      .returning();

    const campaignMap = Object.fromEntries(
      insertedCampaigns.map((c) => [c.name, c.id])
    );

    console.log('Inserted campaigns:', campaignMap);

    // Insert tasks
    console.log('Inserting tasks...');
    await db.insert(tasks).values([
      {
        campaign_id: campaignMap['Spring Collection Launch'],
        channel_id: channelMap['Instagram'],
        title: 'Create carousel posts for spring collection',
        description: 'Design and schedule 5 carousel posts highlighting each tea',
        status: 'in_progress',
        priority: 'high',
        scheduled_date: '2026-04-05',
      },
      {
        campaign_id: campaignMap['Spring Collection Launch'],
        channel_id: channelMap['Instagram'],
        title: 'Film product photography',
        description: 'Shoot new spring collection on lifestyle backgrounds',
        status: 'done',
        priority: 'high',
        scheduled_date: '2026-03-25',
      },
      {
        campaign_id: campaignMap['Mother\'s Day Special'],
        channel_id: channelMap['Facebook'],
        title: 'Create gift set product listings',
        description: 'Set up product pages for Mother\'s Day gift sets',
        status: 'in_progress',
        priority: 'high',
        scheduled_date: '2026-04-10',
      },
      {
        campaign_id: campaignMap['Mother\'s Day Special'],
        channel_id: channelMap['Facebook'],
        title: 'Design Facebook ads',
        description: 'Create 8 ad variations for Mother\'s Day campaign',
        status: 'todo',
        priority: 'high',
        scheduled_date: '2026-04-08',
      },
      {
        campaign_id: campaignMap['Email Newsletter Series'],
        channel_id: channelMap['Email'],
        title: 'Write April newsletter',
        description: 'Create newsletter content with spring recipes',
        status: 'todo',
        priority: 'medium',
        scheduled_date: '2026-04-15',
      },
      {
        campaign_id: campaignMap['Email Newsletter Series'],
        channel_id: channelMap['Email'],
        title: 'Set up email automation',
        description: 'Configure welcome series for new subscribers',
        status: 'done',
        priority: 'medium',
        scheduled_date: '2026-02-01',
      },
      {
        campaign_id: campaignMap['TikTok Content Strategy'],
        channel_id: channelMap['TikTok'],
        title: 'Plan TikTok content calendar',
        description: 'Create 30-day content calendar for TikTok',
        status: 'todo',
        priority: 'medium',
        scheduled_date: '2026-04-20',
      },
      {
        campaign_id: campaignMap['TikTok Content Strategy'],
        channel_id: channelMap['TikTok'],
        title: 'Film tea brewing videos',
        description: 'Shoot 10 short videos of tea preparation',
        status: 'todo',
        priority: 'high',
        scheduled_date: '2026-05-05',
      },
      {
        campaign_id: campaignMap['Pinterest Board Development'],
        channel_id: channelMap['Pinterest'],
        title: 'Create wellness board',
        description: 'Set up wellness and health benefits board',
        status: 'done',
        priority: 'medium',
        scheduled_date: '2026-03-10',
      },
      {
        campaign_id: campaignMap['Pinterest Board Development'],
        channel_id: channelMap['Pinterest'],
        title: 'Design recipe pins',
        description: 'Create 20 unique recipe pin graphics',
        status: 'in_progress',
        priority: 'high',
        scheduled_date: '2026-04-12',
      },
      {
        campaign_id: campaignMap['SEO Blog Series'],
        channel_id: channelMap['SEO'],
        title: 'Write "Benefits of Green Tea" blog post',
        description: '2000+ word SEO-optimized article',
        status: 'done',
        priority: 'high',
        scheduled_date: '2026-03-01',
      },
      {
        campaign_id: campaignMap['SEO Blog Series'],
        channel_id: channelMap['SEO'],
        title: 'Create tea brewing guide',
        description: 'Complete guide with diagrams and videos',
        status: 'in_progress',
        priority: 'high',
        scheduled_date: '2026-04-01',
      },
      {
        campaign_id: campaignMap['Spring Collection Launch'],
        channel_id: channelMap['Google Ads'],
        title: 'Set up Google Ads campaign',
        description: 'Configure search and display ads for spring collection',
        status: 'todo',
        priority: 'high',
        scheduled_date: '2026-04-03',
      },
      {
        campaign_id: campaignMap['Mother\'s Day Special'],
        channel_id: channelMap['Email'],
        title: 'Create Mother\'s Day email sequence',
        description: '5-email sequence for Mother\'s Day campaign',
        status: 'todo',
        priority: 'high',
        scheduled_date: '2026-04-10',
      },
      {
        campaign_id: campaignMap['TikTok Content Strategy'],
        channel_id: channelMap['Instagram'],
        title: 'Reels strategy planning',
        description: 'Plan Instagram Reels content aligned with TikTok',
        status: 'todo',
        priority: 'medium',
        scheduled_date: '2026-04-25',
      },
    ]);

    console.log('Inserted 15 tasks');

    // Insert budget entries (Apr-Sep 2026)
    console.log('Inserting budget entries...');
    await db.insert(budget_entries).values([
      // April
      {
        campaign_id: campaignMap['Spring Collection Launch'],
        channel_id: channelMap['Instagram'],
        month: '2026-04',
        planned_amount: 2000,
        actual_amount: 1500,
        category: 'content',
      },
      {
        campaign_id: campaignMap['Mother\'s Day Special'],
        channel_id: channelMap['Facebook'],
        month: '2026-04',
        planned_amount: 1500,
        actual_amount: 800,
        category: 'ads',
      },
      {
        campaign_id: campaignMap['Email Newsletter Series'],
        channel_id: channelMap['Email'],
        month: '2026-04',
        planned_amount: 200,
        actual_amount: 150,
        category: 'tools',
      },
      // May
      {
        campaign_id: campaignMap['Spring Collection Launch'],
        channel_id: channelMap['Instagram'],
        month: '2026-05',
        planned_amount: 1500,
        actual_amount: 1000,
        category: 'content',
      },
      {
        campaign_id: campaignMap['Mother\'s Day Special'],
        channel_id: channelMap['Facebook'],
        month: '2026-05',
        planned_amount: 1000,
        actual_amount: 400,
        category: 'ads',
      },
      {
        campaign_id: campaignMap['TikTok Content Strategy'],
        channel_id: channelMap['TikTok'],
        month: '2026-05',
        planned_amount: 2000,
        actual_amount: 0,
        category: 'content',
      },
      // June
      {
        campaign_id: campaignMap['TikTok Content Strategy'],
        channel_id: channelMap['TikTok'],
        month: '2026-06',
        planned_amount: 1500,
        actual_amount: 0,
        category: 'content',
      },
      {
        campaign_id: campaignMap['Pinterest Board Development'],
        channel_id: channelMap['Pinterest'],
        month: '2026-06',
        planned_amount: 800,
        actual_amount: 400,
        category: 'tools',
      },
      // July
      {
        campaign_id: campaignMap['SEO Blog Series'],
        channel_id: channelMap['SEO'],
        month: '2026-07',
        planned_amount: 1200,
        actual_amount: 800,
        category: 'content',
      },
      {
        campaign_id: campaignMap['TikTok Content Strategy'],
        channel_id: channelMap['TikTok'],
        month: '2026-07',
        planned_amount: 1000,
        actual_amount: 0,
        category: 'content',
      },
      // August
      {
        campaign_id: campaignMap['Pinterest Board Development'],
        channel_id: channelMap['Pinterest'],
        month: '2026-08',
        planned_amount: 600,
        actual_amount: 100,
        category: 'content',
      },
      // September
      {
        campaign_id: campaignMap['Email Newsletter Series'],
        channel_id: channelMap['Email'],
        month: '2026-09',
        planned_amount: 200,
        actual_amount: 0,
        category: 'tools',
      },
    ]);

    console.log('Inserted 12 budget entries');

    // Insert KPI entries
    console.log('Inserting KPI entries...');
    await db.insert(kpi_entries).values([
      // Instagram KPIs
      {
        channel_id: channelMap['Instagram'],
        campaign_id: campaignMap['Spring Collection Launch'],
        date: '2026-04-05',
        metric_name: 'followers',
        metric_value: 12500,
      },
      {
        channel_id: channelMap['Instagram'],
        campaign_id: campaignMap['Spring Collection Launch'],
        date: '2026-04-05',
        metric_name: 'engagement_rate',
        metric_value: 4.2,
      },
      {
        channel_id: channelMap['Instagram'],
        campaign_id: campaignMap['Spring Collection Launch'],
        date: '2026-04-10',
        metric_name: 'reach',
        metric_value: 45000,
      },
      // Facebook KPIs
      {
        channel_id: channelMap['Facebook'],
        campaign_id: campaignMap['Mother\'s Day Special'],
        date: '2026-04-08',
        metric_name: 'clicks',
        metric_value: 320,
      },
      {
        channel_id: channelMap['Facebook'],
        campaign_id: campaignMap['Mother\'s Day Special'],
        date: '2026-04-08',
        metric_name: 'conversions',
        metric_value: 28,
      },
      {
        channel_id: channelMap['Facebook'],
        campaign_id: campaignMap['Mother\'s Day Special'],
        date: '2026-04-15',
        metric_name: 'impressions',
        metric_value: 125000,
      },
      // Email KPIs
      {
        channel_id: channelMap['Email'],
        campaign_id: campaignMap['Email Newsletter Series'],
        date: '2026-04-01',
        metric_name: 'open_rate',
        metric_value: 32.5,
      },
      {
        channel_id: channelMap['Email'],
        campaign_id: campaignMap['Email Newsletter Series'],
        date: '2026-04-01',
        metric_name: 'ctr',
        metric_value: 4.8,
      },
      {
        channel_id: channelMap['Email'],
        campaign_id: campaignMap['Email Newsletter Series'],
        date: '2026-04-15',
        metric_name: 'conversions',
        metric_value: 12,
      },
      // Pinterest KPIs
      {
        channel_id: channelMap['Pinterest'],
        campaign_id: campaignMap['Pinterest Board Development'],
        date: '2026-04-10',
        metric_name: 'impressions',
        metric_value: 89000,
      },
      {
        channel_id: channelMap['Pinterest'],
        campaign_id: campaignMap['Pinterest Board Development'],
        date: '2026-04-10',
        metric_name: 'clicks',
        metric_value: 1200,
      },
      // SEO KPIs
      {
        channel_id: channelMap['SEO'],
        campaign_id: campaignMap['SEO Blog Series'],
        date: '2026-04-01',
        metric_name: 'impressions',
        metric_value: 5400,
      },
      {
        channel_id: channelMap['SEO'],
        campaign_id: campaignMap['SEO Blog Series'],
        date: '2026-04-01',
        metric_name: 'clicks',
        metric_value: 185,
      },
      // Google Ads KPIs
      {
        channel_id: channelMap['Google Ads'],
        campaign_id: campaignMap['Spring Collection Launch'],
        date: '2026-04-05',
        metric_name: 'impressions',
        metric_value: 250000,
      },
      {
        channel_id: channelMap['Google Ads'],
        campaign_id: campaignMap['Spring Collection Launch'],
        date: '2026-04-05',
        metric_name: 'conversions',
        metric_value: 125,
      },
    ]);

    console.log('Inserted 15 KPI entries');
    console.log('Database seed completed successfully!');
  } catch (error) {
    console.error('Error seeding database:', error);
    process.exit(1);
  }
}

seed();
