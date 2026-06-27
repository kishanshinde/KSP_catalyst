import logger from "./logger.js";

export default function handlePrompt(request) {

  logger.info("FULL PROMPT REQUEST");
  logger.info(JSON.stringify(request, null, 2));

  return {
    "todo": "execute"
  };
}