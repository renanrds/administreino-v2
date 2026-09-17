from django.conf import settings
from django.db import migrations, models
import django.db.models.expressions


class Migration(migrations.Migration):

    dependencies = [
        ('workouts', '0003_exercise_rep_ranges_and_log_snapshots'),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.AddField(
            model_name='exercise',
            name='is_active',
            field=models.BooleanField(default=True),
        ),
        migrations.AddIndex(
            model_name='workout',
            index=models.Index(fields=['user', 'is_active'], name='workout_user_active_idx'),
        ),
        migrations.AddConstraint(
            model_name='exercise',
            constraint=models.CheckConstraint(
                condition=models.Q(('min_reps__isnull', True))
                | models.Q(('max_reps__isnull', True))
                | models.Q(('min_reps__lte', django.db.models.expressions.F('max_reps'))),
                name='exercise_min_reps_lte_max_reps',
            ),
        ),
    ]
