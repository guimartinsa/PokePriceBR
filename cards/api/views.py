from rest_framework.generics import ListAPIView, RetrieveAPIView
from cards.models import Card
from .serializers import CardSerializer


class CardListView(ListAPIView):
    queryset = Card.objects.all()
    serializer_class = CardSerializer


class CardDetailView(RetrieveAPIView):
    queryset = Card.objects.all()
    serializer_class = CardSerializer
