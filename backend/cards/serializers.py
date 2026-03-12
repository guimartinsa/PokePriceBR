from rest_framework import serializers

class ScannedCardSerializer(serializers.Serializer):
    name = serializers.CharField()
    number = serializers.CharField()
    set = serializers.CharField(allow_null=True)
    image = serializers.URLField(allow_null=True)

class ScanCardResponseSerializer(serializers.Serializer):
    success = serializers.BooleanField()
    card = ScannedCardSerializer(required=False)
    error = serializers.CharField(required=False)