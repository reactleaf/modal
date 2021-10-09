import styled, { css } from "styled-components"

import { OVERLAY } from "@styles/zIndex"

const dimmedBackground = (color: boolean | string) => {
  if (!color) return "none"
  if (typeof color === "boolean") return "rgba(0, 0, 0, 0.6)"
  return color
}

export const Overlay = styled.div<{ dim: boolean | string; visible: boolean }>`
  position: fixed;
  display: flex;
  align-items: center;
  justify-content: center;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100%;
  z-index: ${OVERLAY};
  ${({ dim }) =>
    css`
      background: ${dimmedBackground(dim)};
    `};

  // animation
  opacity: 0;
  pointer-events: none;
  transition-property: opacity;
  ${({ visible }) =>
    visible &&
    css`
      opacity: 1;
      pointer-events: initial;
    `}
`
