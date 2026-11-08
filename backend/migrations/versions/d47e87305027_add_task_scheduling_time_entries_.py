"""add task scheduling, time entries, category presets

Revision ID: d47e87305027
Revises: 72530c94b4cb
Create Date: 2026-11-08 15:33:00.469851

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'd47e87305027'
down_revision = '72530c94b4cb'
branch_labels = None
depends_on = None


def upgrade():
    op.create_table('time_entries',
    sa.Column('id', sa.Integer(), nullable=False),
    sa.Column('task_id', sa.Integer(), nullable=True),
    sa.Column('started_at', sa.DateTime(), nullable=False),
    sa.Column('ended_at', sa.DateTime(), nullable=True),
    sa.Column('note', sa.String(length=200), nullable=True),
    sa.Column('created_at', sa.DateTime(), nullable=False),
    sa.Column('updated_at', sa.DateTime(), nullable=False),
    sa.ForeignKeyConstraint(['task_id'], ['tasks.id'], ondelete='SET NULL'),
    sa.PrimaryKeyConstraint('id')
    )
    with op.batch_alter_table('categories', schema=None) as batch_op:
        batch_op.add_column(sa.Column('reminder_tier', sa.String(length=10), nullable=True))
        batch_op.add_column(sa.Column('custom_offsets', sa.JSON(), nullable=False, server_default='[]'))

    with op.batch_alter_table('tasks', schema=None) as batch_op:
        batch_op.add_column(sa.Column('scheduled_date', sa.Date(), nullable=True))
        batch_op.add_column(sa.Column('estimated_minutes', sa.Integer(), nullable=True))
        batch_op.add_column(sa.Column('priority', sa.String(length=10), nullable=False, server_default='medium'))



def downgrade():
    with op.batch_alter_table('tasks', schema=None) as batch_op:
        batch_op.drop_column('priority')
        batch_op.drop_column('estimated_minutes')
        batch_op.drop_column('scheduled_date')

    with op.batch_alter_table('categories', schema=None) as batch_op:
        batch_op.drop_column('custom_offsets')
        batch_op.drop_column('reminder_tier')

    op.drop_table('time_entries')
