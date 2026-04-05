from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('users', '0003_user_terms_accepted'),
    ]

    operations = [
        migrations.AddField(
            model_name='user',
            name='age',
            field=models.PositiveIntegerField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name='user',
            name='experience_level',
            field=models.CharField(choices=[('beginner', 'Iniciante'), ('intermediate', 'Intermediario'), ('advanced', 'Avancado')], default='intermediate', max_length=20),
        ),
        migrations.AddField(
            model_name='user',
            name='gender',
            field=models.CharField(blank=True, choices=[('male', 'Masculino'), ('female', 'Feminino'), ('non_binary', 'Nao-binario'), ('other', 'Outro'), ('prefer_not_to_say', 'Prefiro nao informar')], default='', max_length=20),
        ),
        migrations.AddField(
            model_name='user',
            name='gym_app_preference',
            field=models.CharField(choices=[('none', 'Nenhum'), ('wellhub', 'Wellhub'), ('totalpass', 'Totalpass'), ('both', 'Wellhub e Totalpass')], default='none', max_length=20),
        ),
        migrations.AddField(
            model_name='user',
            name='primary_goal',
            field=models.CharField(blank=True, default='', max_length=120),
        ),
        migrations.AddField(
            model_name='user',
            name='weekly_training_days',
            field=models.PositiveIntegerField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name='gymlocation',
            name='gym_app',
            field=models.CharField(choices=[('wellhub', 'Wellhub'), ('totalpass', 'Totalpass')], default='wellhub', max_length=20),
        ),
        migrations.AlterUniqueTogether(
            name='gymlocation',
            unique_together={('user', 'gym_app', 'name')},
        ),
        migrations.RunSQL(
            sql=(
                "UPDATE users_user SET gym_app_preference = "
                "CASE WHEN wellhub_enabled THEN 'wellhub' ELSE 'none' END;"
            ),
            reverse_sql="UPDATE users_user SET gym_app_preference = 'none';"
        ),
    ]