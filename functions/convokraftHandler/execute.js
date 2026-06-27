import logger from "./logger.js";

export default function handleExecute(request) {

    logger.info("REQUEST RECEIVED");

    try {

        logger.info(JSON.stringify(request, null, 2));

    } catch(err) {

        logger.error(err);

    }

    return {
        message: "Execute called successfully"
    };
}