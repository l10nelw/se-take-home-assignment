import { Orders, Bot, BotStaff } from './objects.js';
import { pause } from './util.js';

/** @import { Order, Bot } from './objects.js' */

const NEW_ITEM_PAUSE_MS = 500;

/** @type {HTMLElement} */ const $pendingArea = document.getElementById('pendingArea');
/** @type {HTMLElement} */ const $processingArea = document.getElementById('processingArea');
/** @type {HTMLElement} */ const $completedArea = document.getElementById('completedArea');
/** @type {HTMLElement} */ const $orderTemplate = document.getElementById('order-');
/** @type {HTMLElement} */ const $botTemplate = document.getElementById('bot-');

/**
 * Handle DOM element operations.
 */
const UI = {
  /** @typedef {HTMLElement & { $orderSlot: HTMLElement }} BotElement */

  /**
   * @param {Order} order
   * @returns {Promise<HTMLElement>}
   */
  addOrderElement(order) {
    /** @type {HTMLElement} */
    const $order = $orderTemplate.cloneNode(true);
    $order.id = `order-${order.id}`;
    $order.hidden = false;
    $order.querySelector('.order-id').textContent = order.id;
    if (order.vip) {
      $order.querySelector('.order-vip').hidden = false;
    }
    $pendingArea.append($order);
    return $order;
  },

  /**
   * @param {Order} order
   * @param {Bot | Array} destination
   * @returns {Promise<HTMLElement>}
   */
  async moveOrderElement(order, destination) {
    /** @type {HTMLElement} */
    const $order = document.getElementById(`order-${order.id}`);
    if (destination instanceof Bot) {
      /** @type {BotElement} */
      const $bot = document.getElementById(`bot-${destination.id}`);
      await pause(NEW_ITEM_PAUSE_MS);
      $bot.$orderSlot.append($order);
      return $bot;
    }
    if (destination === Orders.pending || destination === Orders.pendingVIP) {
      $orderTemplate.insertAdjacentElement('afterend', $order);
      return $pendingArea;
    }
    if (destination === Orders.completed) {
      $completedArea.append($order);
      return $completedArea;
    }
  },

  /**
   * @param {Bot} bot
   * @returns {BotElement}
   */
  addBotElement(bot) {
    /** @type {BotElement} */
    const $bot = $botTemplate.cloneNode(true);
    $bot.id = `bot-${bot.id}`;
    $bot.hidden = false;
    $bot.$orderSlot = $bot.querySelector('.bot-order');
    $processingArea.append($bot);
    return $bot;
  },

  /**
   * @param {Bot} bot
   */
  removeBotElement(bot) {
    const $bot = document.getElementById(`bot-${bot.id}`);
    $bot.remove();
  },
}

document.body.addEventListener('click', handleClick);
document.body.addEventListener('order:complete', handleCompleteOrder);

/**
 * @param {Event & { target: HTMLElement }} event
 */
function handleClick({ target }) {
  const targetId = target.closest('button')?.id || '';

  switch (targetId) {
    case 'addOrder':
      runAddOrder();
    break;
    case 'addOrderVIP':
      runAddOrder('vip');
    break;
    case 'addBot':
      runPickupOrder(runAddBot());
    break;
    case 'removeBot':
      runRemoveBot();
    break;
  }
}

/**
 * @param {any} [vip]
 */
function runAddOrder(vip = '') {
  const order = vip ? Orders.addVIP() : Orders.add();
  UI.addOrderElement(order);
  const bot = BotStaff.findIdle();
  if (bot) {
    runPickupOrder(bot);
  }
}

/**
 * @param {Bot} bot
 */
async function runPickupOrder(bot) {
  bot.pickupOrder();
  if (bot.order) {
    await UI.moveOrderElement(bot.order, bot);
  }
}

/**
 * @returns {Promise<Bot>}
 */
function runAddBot() {
  const bot = BotStaff.add();
  UI.addBotElement(bot);
  return bot;
}

function runRemoveBot() {
  const [bot, order] = BotStaff.remove();
  if (order) {
    UI.moveOrderElement(order, Orders.pending);
  }
  UI.removeBotElement(bot);
}

/**
 * @param {object} event
 * @param {Order} event.order
 * @param {Bot} event.bot
 */
async function handleCompleteOrder({ order, bot }) {
  await UI.moveOrderElement(order, Orders.completed);
  runPickupOrder(bot);
}
