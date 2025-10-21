import React from 'react';
import Layout from '@theme/Layout';
import HomepageFeatures from '@site/src/components/HomepageFeatures';
import useDocusaurusContext from '@docusaurus/useDocusaurusContext';

export default function Home(): JSX.Element {
  const {siteConfig} = useDocusaurusContext();
  return (
    <Layout
      title={`首页`}
      description={`${siteConfig.tagline}`}>
      <main>
        {/* 首页现在只包含图片特性区域 */}
        <HomepageFeatures />
      </main>
    </Layout>
  );
}