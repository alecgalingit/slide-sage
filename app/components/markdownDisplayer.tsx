import styled from "@emotion/styled";
import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import { ReactElement } from "react";
import "katex/dist/katex.min.css";

const theme = {
  fonts: {
    body: "system-ui, -apple-system, sans-serif",
    heading: "system-ui, -apple-system, sans-serif",
  },
  fontSizes: {
    sm: "0.875rem",
    md: "1rem",
    lg: "1.125rem",
    xl: "1.25rem",
    "2xl": "1.5rem",
    "3xl": "1.875rem",
    "4xl": "2.25rem",
  },
  fontWeights: {
    normal: 400,
    medium: 500,
    bold: 700,
    extrabold: 800,
  },
  colors: {
    text: "inherit",
    border: "#e6e6e6",
    link: "#0366d6",
    code: "#24292e",
    accent: "#e6e6e6",
  },
  spacing: {
    xs: "0.25rem",
    sm: "0.5rem",
    md: "1rem",
    lg: "1.5rem",
    xl: "2rem",
  },
};

interface StyledMarkdownProps {
  fontSize?: "sm" | "md" | "lg";
}

const StyledMarkdown = styled.div<StyledMarkdownProps>`
  font-family: ${theme.fonts.body};
  font-size: ${(props) => theme.fontSizes[props.fontSize || "md"]};
  line-height: 1.6;
  color: ${theme.colors.text};

  h1,
  h2,
  h3,
  h4,
  h5,
  h6 {
    font-family: ${theme.fonts.heading};
    line-height: 1.25;
    margin-top: ${theme.spacing.xl};
    margin-bottom: ${theme.spacing.md};
    font-weight: ${theme.fontWeights.bold};
  }

  h1 {
    font-size: ${theme.fontSizes["4xl"]};
    font-weight: ${theme.fontWeights.extrabold};
  }

  h2 {
    font-size: ${theme.fontSizes["3xl"]};
  }

  h3 {
    font-size: ${theme.fontSizes["2xl"]};
  }

  p {
    margin: ${theme.spacing.md} 0;
    word-break: break-word;

    &:first-of-type {
      margin-top: 0;
    }

    &:last-of-type {
      margin-bottom: 0;
    }
  }

  a {
    color: ${theme.colors.link};
    text-decoration: none;

    &:hover {
      text-decoration: underline;
    }
  }

  ul,
  ol {
    margin: ${theme.spacing.md} 0;
    padding-left: ${theme.spacing.xl};
    list-style-position: outside;

    ul,
    ol {
      margin: ${theme.spacing.sm} 0;
    }
  }

  ul {
    list-style-type: disc;

    ul {
      list-style-type: circle;

      ul {
        list-style-type: square;
      }
    }
  }

  ol {
    list-style-type: decimal;

    ol {
      list-style-type: lower-alpha;

      ol {
        list-style-type: lower-roman;
      }
    }
  }

  li {
    margin: ${theme.spacing.xs} 0;
    padding-left: ${theme.spacing.xs};
    display: list-item;
  }

  blockquote {
    margin: ${theme.spacing.md} 0;
    padding-left: ${theme.spacing.lg};
    border-left: 3px solid ${theme.colors.accent};
    font-style: italic;
  }

  pre,
  code {
    font-family: "Monaco", "Consolas", monospace;
    background-color: ${theme.colors.accent}10;
    border-radius: 3px;
  }

  pre {
    padding: ${theme.spacing.md};
    overflow-x: auto;

    code {
      background: none;
      padding: 0;
    }
  }

  code {
    padding: 2px ${theme.spacing.xs};
  }

  table {
    width: 100%;
    margin: ${theme.spacing.md} 0;
    border-collapse: collapse;
  }

  th,
  td {
    padding: ${theme.spacing.sm} ${theme.spacing.md};
    border: 1px solid ${theme.colors.border};
    text-align: left;
  }

  th {
    font-weight: ${theme.fontWeights.bold};
    background-color: ${theme.colors.accent}10;
  }

  // Image styling
  img {
    max-width: 100%;
    height: auto;
    margin: ${theme.spacing.md} 0;
    border-radius: 4px;
  }
`;

interface RenderedMarkdownProps {
  source: string;
  fontSize?: "sm" | "md" | "lg";
}

export function RenderedMarkdown({
  source,
  fontSize = "md",
}: RenderedMarkdownProps): ReactElement {
  const remarkPlugins = [remarkGfm, remarkMath];
  const rehypePlugins = [rehypeKatex];

  return (
    <StyledMarkdown fontSize={fontSize}>
      <Markdown remarkPlugins={remarkPlugins} rehypePlugins={rehypePlugins}>
        {source}
      </Markdown>
    </StyledMarkdown>
  );
}
