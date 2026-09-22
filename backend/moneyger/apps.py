import logging
import os
import sys
import threading

from django.apps import AppConfig

logger = logging.getLogger(__name__)
_sweep_started = False


def _market_sweep_loop():
    import time

    from django.db import close_old_connections

    while True:
        time.sleep(20)
        close_old_connections()
        try:
            from .market_bot import sweep_market_drafts
            sweep_market_drafts()
        except Exception:
            logger.exception('Varredura da lista de mercado falhou')


class MoneygerConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'moneyger'
    verbose_name = 'Moneyger'

    def ready(self):
        global _sweep_started
        if _sweep_started:
            return
        argv = ' '.join(sys.argv)
        if any(cmd in argv for cmd in ('migrate', 'makemigrations', 'test', 'collectstatic', 'shell', 'check')):
            return
        if 'runserver' in argv and os.environ.get('RUN_MAIN') != 'true':
            return
        _sweep_started = True
        threading.Thread(target=_market_sweep_loop, name='moneyger-market-sweep', daemon=True).start()
