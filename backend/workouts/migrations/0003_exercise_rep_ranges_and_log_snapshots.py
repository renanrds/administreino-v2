from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('workouts', '0002_add_historical_session_fields'),
    ]

    operations = [
        migrations.AddField(
            model_name='exercise',
            name='max_reps',
            field=models.PositiveIntegerField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name='exercise',
            name='min_reps',
            field=models.PositiveIntegerField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name='exerciselog',
            name='planned_max_reps',
            field=models.PositiveIntegerField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name='exerciselog',
            name='planned_min_reps',
            field=models.PositiveIntegerField(blank=True, null=True),
        ),
        migrations.RunSQL(
            sql='UPDATE workouts_exercise SET min_reps = reps, max_reps = reps WHERE min_reps IS NULL OR max_reps IS NULL;',
            reverse_sql='UPDATE workouts_exercise SET min_reps = NULL, max_reps = NULL;'
        ),
    ]