'use strict';
/**
 * Kafka event publisher — gracefully no-ops when Kafka is unavailable.
 * Topics:
 *   appointments   — appointment.created, appointment.cancelled, appointment.completed
 *   patients       — patient.registered, patient.admitted, patient.discharged
 *   billing        — billing.created, billing.paid
 *   lab            — lab.ordered, lab.completed
 *   pharmacy       — prescription.created, prescription.dispensed
 *   emergency      — emergency.triggered
 *   notifications  — notification.sent
 */

const logger = require('./logger');

/**
 * Publish an event to a Kafka topic.
 * @param {Express.Application} app  — Express app (holds kafkaProducer)
 * @param {string} topic             — Kafka topic name
 * @param {string} eventType         — e.g. 'appointment.created'
 * @param {object} payload           — event data
 */
async function publish(app, topic, eventType, payload) {
  const producer = app?.get('kafkaProducer');
  if (!producer) return; // Kafka unavailable — silent no-op

  try {
    await producer.send({
      topic,
      messages: [{
        key: eventType,
        value: JSON.stringify({
          eventType,
          timestamp: new Date().toISOString(),
          payload
        })
      }]
    });
    logger.debug(`Kafka event published: ${topic}/${eventType}`);
  } catch (err) {
    logger.warn(`Kafka publish failed (${topic}/${eventType}):`, err.message);
    // Non-blocking — event loss is acceptable vs crashing the request
  }
}

module.exports = { publish };
