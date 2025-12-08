import fs from 'fs/promises';
import path from 'path';
import Link from 'next/link';
import type { Metadata } from 'next';
import matter from 'gray-matter';
import { compileMDX } from 'next-mdx-remote/rsc';
import React from 'react';
import VibeSlider from '@/components/VibeSlider';
import ExplainWhy, { exampleReasons } from '@/components/ExplainWhy';

type CaseStudyFrontmatter = {
  title: string;
  description: string;
  date?: string;
};

type Heading = {
  id: string;
  title: string;
  level: number;
};

const CASE_STUDY_PATH = path.join(
  process.cwd(),
  'content',
  'case-studies',
  'student-apartments.mdx'
);

function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-');
}

function getTextFromChildren(node: React.ReactNode): string {
  if (typeof node === 'string') return node;
  if (Array.isArray(node)) {
    return node.map(getTextFromChildren).join('');
  }
  if (React.isValidElement(node)) {
    return getTextFromChildren(node.props.children);
  }
  return '';
}

function makeHeading<Tag extends keyof JSX.IntrinsicElements>(
  tag: Tag,
  baseClassName: string
) {
  const HeadingComponent = ({
    children,
    className,
    ...rest
  }: React.ComponentPropsWithoutRef<Tag>) => {
    const textContent = getTextFromChildren(children);
    const id = slugify(textContent);
    const combinedClassName = [baseClassName, className]
      .filter(Boolean)
      .join(' ');

    return React.createElement(
      tag,
      { id, className: combinedClassName, ...rest },
      children
    );
  };

  HeadingComponent.displayName = `Heading(${tag})`;
  return HeadingComponent;
}

const mdxComponents = {
  h1: makeHeading('h1', 'sr-only'),
  h2: makeHeading(
    'h2',
    'mt-12 text-3xl font-bold text-gray-900 tracking-tight first:mt-0'
  ),
  h3: makeHeading(
    'h3',
    'mt-8 text-2xl font-semibold text-gray-900 tracking-tight'
  ),
  ul: ({
    className,
    ...props
  }: React.HTMLAttributes<HTMLUListElement>) => (
    <ul
      className={`list-disc pl-6 space-y-2 text-gray-700 ${className ?? ''}`}
      {...props}
    />
  ),
  ol: ({
    className,
    ...props
  }: React.OlHTMLAttributes<HTMLOListElement>) => (
    <ol
      className={`list-decimal pl-6 space-y-2 text-gray-700 ${className ?? ''}`}
      {...props}
    />
  ),
  li: ({
    className,
    ...props
  }: React.LiHTMLAttributes<HTMLLIElement>) => (
    <li
      className={`leading-relaxed text-gray-700 ${className ?? ''}`}
      {...props}
    />
  ),
  p: ({ className, ...props }: React.HTMLAttributes<HTMLParagraphElement>) => (
    <p
      className={`text-gray-700 leading-relaxed ${className ?? ''}`}
      {...props}
    />
  ),
  hr: (props: React.HTMLAttributes<HTMLHRElement>) => (
    <hr className="my-12 border-gray-200" {...props} />
  ),
};

function extractHeadings(markdown: string): Heading[] {
  const lines = markdown.split('\n');
  const headings: Heading[] = [];

  for (const line of lines) {
    const match = /^(#{1,6})\s+(.*)$/.exec(line.trim());
    if (!match) continue;

    const level = match[1].length;
    const title = match[2].trim();

    headings.push({
      id: slugify(title),
      title,
      level,
    });
  }

  return headings;
}

async function loadCaseStudy() {
  const raw = await fs.readFile(CASE_STUDY_PATH, 'utf8');
  const { content, data } = matter(raw);
  const headings = extractHeadings(content);

  const compiled = await compileMDX({
    source: content,
    components: mdxComponents,
  });

  return {
    headings,
    metadata: data as CaseStudyFrontmatter,
    content: compiled.content,
  };
}

export async function generateMetadata(): Promise<Metadata> {
  const { metadata } = await loadCaseStudy();

  return {
    title: metadata.title,
    description: metadata.description,
  };
}

export default async function StudentApartmentsCaseStudy() {
  const { metadata, headings, content } = await loadCaseStudy();
  const formattedDate = metadata.date
    ? new Date(metadata.date).toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    })
    : undefined;

  const tocItems = headings.filter(
    (heading) => heading.level > 1 && heading.level <= 3
  );

  return (
    <div className="min-h-screen bg-white">
      <section className="bg-gradient-to-br from-blue-50 to-orange-50 py-20 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-4xl md:text-6xl font-bold text-gray-900 mb-6">
            {metadata.title}
          </h1>
          <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto">
            {metadata.description}
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/apartments"
              className="bg-blue-600 text-white px-8 py-3 rounded-lg font-semibold hover:bg-blue-700 transition-colors"
            >
              Explore apartments
            </Link>
            <Link
              href="/owner"
              className="border-2 border-blue-600 text-blue-600 px-8 py-3 rounded-lg font-semibold hover:bg-blue-50 transition-colors"
            >
              For owners
            </Link>
          </div>
          {formattedDate && (
            <p className="mt-6 text-sm text-gray-500">
              Updated {formattedDate}
            </p>
          )}
        </div>
      </section>

      <main className="py-16 px-4">
        <div className="max-w-6xl mx-auto grid gap-12 lg:grid-cols-[minmax(0,260px)_minmax(0,1fr)]">
          <aside className="hidden lg:block">
            <div className="sticky top-28 space-y-4">
              <div>
                <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider">
                  On this page
                </h2>
                <nav className="mt-4 space-y-2 text-sm">
                  {tocItems.map((heading) => (
                    <a
                      key={heading.id}
                      href={`#${heading.id}`}
                      className={`block text-gray-600 hover:text-blue-600 transition ${heading.level === 3 ? 'pl-4 text-xs' : ''
                        }`}
                    >
                      {heading.title}
                    </a>
                  ))}
                </nav>
              </div>
              <div className="rounded-xl border border-blue-100 bg-blue-50 p-4 text-sm text-blue-800">
                <p className="font-semibold">Need a shareable version?</p>
                <p className="mt-1">
                  Talk with our team for a tailored walkthrough and shareable
                  deck.
                </p>
                <Link
                  href="/contact"
                  className="mt-3 inline-flex items-center rounded-md border border-blue-600 px-3 py-2 text-xs font-semibold text-blue-600 hover:bg-blue-100"
                >
                  Book a walkthrough
                </Link>
              </div>
            </div>
          </aside>

          <article className="prose prose-lg max-w-none prose-headings:text-gray-900 prose-strong:text-gray-900">
            {content}
          </article>
        </div>
      </main>

      <section className="py-16 px-4 bg-blue-600 text-white">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl font-bold mb-4">
            Ready to find your perfect student apartment?
          </h2>
          <p className="text-xl mb-8 text-blue-100">
            Join thousands of students who found their ideal living space
            through our platform.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/apartments"
              className="bg-white text-blue-600 px-8 py-3 rounded-lg font-semibold hover:bg-blue-50 transition-colors"
            >
              Start your search
            </Link>
            <Link
              href="/signup"
              className="border-2 border-white text-white px-8 py-3 rounded-lg font-semibold hover:bg-blue-700 transition-colors"
            >
              Create account
            </Link>
          </div>
        </div>
      </section>

      <section className="py-16 px-4 bg-gray-50">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-3xl font-bold text-gray-900 mb-12">
            Interactive components
          </h2>

          <div className="grid md:grid-cols-2 gap-12">
            <div>
              <h3 className="text-xl font-semibold text-gray-900 mb-6">
                Vibe slider
              </h3>
              <VibeSlider />
            </div>

            <div>
              <h3 className="text-xl font-semibold text-gray-900 mb-6">
                Why recommended
              </h3>
              <ExplainWhy reasons={exampleReasons} />
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
